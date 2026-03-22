import { NextResponse } from "next/server";
import fs from "fs";
import { execSync } from "child_process";
import { OPENCLAW_CONFIG } from "@/lib/paths";

export const dynamic = "force-dynamic";

export async function GET() {
  const agents: Record<string, unknown>[] = [];

  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, "utf-8"));
    const agentList: Array<Record<string, unknown>> = config?.agents?.list || [];

    // Get real session status from openclaw
    let byAgentData: Record<string, unknown>[] = [];
    let recentSessions: Record<string, unknown>[] = [];
    try {
      const raw = execSync("openclaw status --json 2>/dev/null", { timeout: 5000 }).toString();
      const status = JSON.parse(raw);
      byAgentData = (status.sessions?.byAgent || []) as Record<string, unknown>[];
      recentSessions = (status.sessions?.recent || []) as Record<string, unknown>[];
    } catch {}

    const nameOverride: Record<string, string> = {
      main: "Dev",
      discover: "Discover Agent",
      influencer: "AI Influencer Agent",
    };

    const emojiMap: Record<string, string> = {
      main: "⚡",
      discover: "🔍",
      influencer: "🎭",
    };

    const colorMap: Record<string, string> = {
      main: "#89b4fa",
      discover: "#a6e3a1",
      influencer: "#cba6f7",
    };

    for (const agent of agentList) {
      const id = agent.id as string;
      const model = (agent.model as string) || config?.agents?.defaults?.model?.primary || "unknown";
      const name = nameOverride[id] || (agent.name ? String(agent.name) : id.charAt(0).toUpperCase() + id.slice(1));
      const workspace = (agent.workspace as string) || "";

      // Find agent in byAgent data
      const agentStatus = byAgentData.find((a) => (a.agentId || a.id) === id) as Record<string, unknown> | undefined;
      const agentSessionCount = agentStatus ? Number(agentStatus.count || agentStatus.sessions || 0) : 0;
      
      // Find last activity from recent sessions for this agent
      const agentRecentSessions = recentSessions.filter((s) => {
        const key = String(s.key || s.sessionKey || "");
        return key.includes(`agent:${id}`);
      });
      
      const lastActive = agentRecentSessions.length > 0
        ? agentRecentSessions.reduce((latest, s) => {
            const ts = String(s.updatedAt || s.lastActive || "");
            return ts > latest ? ts : latest;
          }, "")
        : agentStatus ? String(agentStatus.lastActive || "") : "";

      // Determine real status - active if has sessions in last 10 minutes
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const isActive = lastActive > tenMinAgo || agentSessionCount > 0;

      // Get allowAgents from config
      const allowAgents = (agent.allowAgents || []) as string[];

      agents.push({
        id,
        name,
        emoji: emojiMap[id] || "🤖",
        model: model.includes("/") ? model.split("/").pop()! : model,
        status: isActive ? "online" : "offline",
        lastActive: lastActive || new Date().toISOString(),
        workspace,
        color: colorMap[id] || "#94a3b8",
        allowAgents,
        allowAgentsDetails: allowAgents
          .map((subId) => {
            const sub = agentList.find((a) => a.id === subId);
            return sub
              ? {
                  id: subId,
                  name: nameOverride[subId] || String(sub.name || subId),
                  emoji: emojiMap[subId] || "🤖",
                  color: colorMap[subId] || "#94a3b8",
                }
              : null;
          })
          .filter(Boolean),
        activeSessions: agentSessionCount || agentRecentSessions.length,
        dmPolicy: (agent.dmPolicy as string) || "default",
      });
    }
  } catch (err) {
    console.error("Failed to read openclaw config:", err);
  }

  // Fallback if no agents found
  if (agents.length === 0) {
    agents.push({
      id: "main",
      name: "Dev",
      emoji: "⚡",
      model: "claude-opus-4-6",
      status: "online",
      lastActive: new Date().toISOString(),
      workspace: "",
      color: "#89b4fa",
      allowAgents: [],
      allowAgentsDetails: [],
      activeSessions: 1,
    });
  }

  return NextResponse.json({ agents });
}
