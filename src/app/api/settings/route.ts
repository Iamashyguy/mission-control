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

    // Read models from providers
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

    // Extract agent configurations
    const agents: AgentConfig[] = [];
    const agentList = config?.agents?.list || [];
    for (const agent of agentList) {
      const a = agent as Record<string, unknown>;
      agents.push({
        id: a.id as string,
        model: ((a.model as Record<string, unknown>)?.primary as string) || config?.agents?.defaults?.model?.primary || "unknown",
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

    // Channels
    const channels: Array<{ name: string; enabled: boolean }> = [];
    const plugins = config?.plugins?.entries || {};
    for (const [key, val] of Object.entries(plugins)) {
      const p = val as Record<string, unknown>;
      channels.push({
        name: key,
        enabled: p.enabled !== false,
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
