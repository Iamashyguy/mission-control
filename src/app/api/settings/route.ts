import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";
import { OPENCLAW_CONFIG, OPENCLAW_DIR, OPENCLAW_WORKSPACE } from "@/lib/paths";

export const dynamic = "force-dynamic";

interface ModelConfig {
  id: string;
  provider: string;
  model: string;
  authType: string;
  context1m: boolean;
  cacheRetention: string;
  isDefault: boolean;
}

interface AgentConfig {
  id: string;
  model: string;
  workspace: string;
  crons: number;
}

interface CronConfig {
  name: string;
  schedule: string;
  agent: string;
  model: string;
  enabled: boolean;
}

export async function GET() {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, "utf-8"));

    // Extract model configurations
    const models: ModelConfig[] = [];
    const modelsConfig = config?.models || {};
    const providers = modelsConfig?.providers || {};

    // Read custom providers (e.g. MiniMax)
    for (const [provId, provData] of Object.entries(providers)) {
      const prov = provData as Record<string, unknown>;
      const provModels = (prov.models || []) as Array<Record<string, unknown>>;
      for (const m of provModels) {
        models.push({
          id: `${provId}/${m.id || m.model || "unknown"}`,
          provider: provId,
          model: (m.model || m.id || "unknown") as string,
          authType: prov.apiKey ? "api_key" : prov.setupToken ? "token" : (prov.auth as string) || "unknown",
          context1m: !!(m.context1m),
          cacheRetention: (m.cacheRetention || "default") as string,
          isDefault: false,
        });
      }
    }

    // Add built-in Anthropic models from agent defaults
    const agentDefaults = config?.agents?.defaults || {};
    const defaultModels = agentDefaults?.models || {};
    const authProfiles = config?.auth?.profiles || {};

    // Determine Anthropic auth type
    const anthropicAuth = authProfiles["anthropic:default"];
    const anthropicAuthType = anthropicAuth?.mode === "token" ? "token" : anthropicAuth?.mode === "api_key" ? "api_key" : "built-in";

    for (const [modelId, modelInfo] of Object.entries(defaultModels)) {
      const info = modelInfo as Record<string, unknown>;
      const provider = modelId.split("/")[0] || "unknown";
      const modelName = modelId.split("/")[1] || modelId;
      // Skip if already added from custom providers
      if (!models.find(m => m.id === modelId)) {
        models.push({
          id: modelId,
          provider,
          model: modelName,
          authType: provider === "anthropic" ? anthropicAuthType : "built-in",
          context1m: false,
          cacheRetention: (info.cacheRetention as string) || "long",
          isDefault: modelId === agentDefaults?.model?.primary,
        });
      }
    }

    // Add primary + fallback models if not already listed
    const primaryModel = agentDefaults?.model?.primary as string;
    if (primaryModel && !models.find(m => m.id === primaryModel)) {
      const [prov, mod] = primaryModel.split("/");
      models.push({
        id: primaryModel,
        provider: prov,
        model: mod,
        authType: prov === "anthropic" ? anthropicAuthType : "built-in",
        context1m: false,
        cacheRetention: "long",
        isDefault: true,
      });
    }
    const fallbacks = (agentDefaults?.model?.fallbacks || []) as string[];
    for (const fb of fallbacks) {
      if (!models.find(m => m.id === fb)) {
        const [prov, mod] = fb.split("/");
        models.push({
          id: fb, provider: prov, model: mod,
          authType: "built-in", context1m: false, cacheRetention: "default", isDefault: false,
        });
      }
    }

    // Sort: default first, then anthropic, then others
    models.sort((a, b) => {
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      if (a.provider !== b.provider) return a.provider === "anthropic" ? -1 : 1;
      return a.model.localeCompare(b.model);
    });

    // Extract agent configurations
    const agents: AgentConfig[] = [];
    const agentList = config?.agents?.list || [];
    for (const agent of agentList) {
      const a = agent as Record<string, unknown>;
      // model can be a string or an object with primary key
      let agentModel = "unknown";
      if (typeof a.model === "string") {
        agentModel = a.model;
      } else if (typeof a.model === "object" && a.model !== null) {
        agentModel = (a.model as Record<string, unknown>).primary as string || "unknown";
      } else {
        agentModel = config?.agents?.defaults?.model?.primary || "unknown";
      }
      agents.push({
        id: a.id as string,
        model: agentModel,
        workspace: (a.workspace as string) || "",
        crons: 0, // will count below
      });
    }

    // Extract cron configurations
    const crons: CronConfig[] = [];
    const cronList = config?.crons || config?.cron?.jobs || [];
    if (Array.isArray(cronList)) {
      for (const c of cronList) {
        const cron = c as Record<string, unknown>;
        crons.push({
          name: (cron.name || cron.id || "unnamed") as string,
          schedule: (cron.schedule || cron.cron || "") as string,
          agent: (cron.agent || "main") as string,
          model: (cron.model || "") as string,
          enabled: cron.enabled !== false,
        });
      }
    }

    // Count crons per agent
    for (const agent of agents) {
      agent.crons = crons.filter(c => c.agent === agent.id).length;
    }

    // System info
    const systemInfo = {
      hostname: os.hostname(),
      platform: `${os.type()} ${os.release()} (${os.arch()})`,
      nodeVersion: process.version,
      nextVersion: getPackageVersion("next"),
      totalMemory: `${(os.totalmem() / (1024 ** 3)).toFixed(0)} GB`,
      cpus: os.cpus().length,
      openclawDir: OPENCLAW_DIR,
      workspaceDir: OPENCLAW_WORKSPACE,
    };

    // Gateway config
    const gateway = config?.gateway || {};
    const gatewayInfo = {
      bind: gateway.bind || "unknown",
      remoteUrl: gateway.remote?.url || "none",
    };

    // Channels — check actual configuration status, not just enabled flag
    const channels: Array<{ name: string; enabled: boolean; status: string }> = [];
    const plugins = config?.plugins?.entries || {};
    const channelsConfig = config?.channels || {};
    
    // Get real status from openclaw status if possible
    let channelSummary: string[] = [];
    try {
      const { exec: execSync } = require("child_process");
      const { promisify } = require("util");
      const execAsync = promisify(execSync);
      const { stdout } = await execAsync("openclaw status --json", { timeout: 5000 });
      const statusData = JSON.parse(stdout);
      channelSummary = statusData.channelSummary || [];
    } catch {}
    
    for (const [key, val] of Object.entries(plugins)) {
      const p = val as Record<string, unknown>;
      const isEnabled = p.enabled !== false;
      
      // Determine real status from channelSummary
      let status = "not configured";
      const summaryLine = channelSummary.find((s: string) => s.toLowerCase().startsWith(key.toLowerCase()));
      if (summaryLine) {
        if (summaryLine.includes("configured") && !summaryLine.includes("not configured")) {
          status = "active";
        } else if (summaryLine.includes("linked")) {
          status = "linked";
        } else if (summaryLine.includes("not configured")) {
          status = "not configured";
        }
      }
      
      // Also check if channel has actual config in channels section
      const hasChannelConfig = !!channelsConfig[key];
      
      channels.push({
        name: key,
        enabled: isEnabled && (status === "active" || status === "linked"),
        status,
      });
    }

    // Budget info (from config or defaults)
    const budget = {
      monthlyBudget: 220,
      subscriptionCost: 200,
      minimaxCost: 20,
      apiBackupBudget: 50,
    };

    return NextResponse.json({
      models,
      agents,
      crons,
      systemInfo,
      gatewayInfo,
      channels,
      budget,
      configPath: OPENCLAW_CONFIG,
      configSize: `${(fs.statSync(OPENCLAW_CONFIG).size / 1024).toFixed(1)} KB`,
    });
  } catch (err) {
    console.error("Failed to read settings:", err);
    return NextResponse.json({ error: "Failed to read settings" }, { status: 500 });
  }
}

function getPackageVersion(pkg: string): string {
  try {
    const pkgPath = path.join(process.cwd(), "node_modules", pkg, "package.json");
    const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    return pkgJson.version || "unknown";
  } catch {
    return "unknown";
  }
}
