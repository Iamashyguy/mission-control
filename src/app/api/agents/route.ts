import { NextResponse } from "next/server";
import fs from "fs";
import { OPENCLAW_CONFIG } from "@/lib/paths";

export const dynamic = "force-dynamic";

interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  model: string;
  status: string;
  lastActive: string;
  workspace: string;
}

export async function GET() {
  const agents: AgentInfo[] = [];

  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, "utf-8"));
    const agentList: Array<Record<string, unknown>> = config?.agents?.list || [];

    for (const agent of agentList) {
      const id = agent.id as string;
      const model = (agent.model as string) || config?.agents?.defaults?.model?.primary || "unknown";
      const nameOverride: Record<string, string> = { main: "Dev", discover: "Discover Agent", influencer: "AI Influencer Agent" };
      const name = nameOverride[id] || (agent.name ? String(agent.name) : id.charAt(0).toUpperCase() + id.slice(1));
      const workspace = (agent.workspace as string) || "";

      // Pick emoji based on agent id
      const emojiMap: Record<string, string> = {
        main: "⚡",
        discover: "🔍",
        influencer: "🎭",
      };

      agents.push({
        id,
        name,
        emoji: emojiMap[id] || "🤖",
        model: model.includes("/") ? model.split("/").pop()! : model,
        status: "active",
        lastActive: new Date().toISOString(),
        workspace,
      });
    }
  } catch (err) {
    console.error("Failed to read openclaw config:", err);
  }

  // If no agents found, add the main dev agent
  if (agents.length === 0) {
    agents.push({
      id: "main",
      name: "Dev",
      emoji: "⚡",
      model: "claude-opus-4-6",
      status: "active",
      lastActive: new Date().toISOString(),
      workspace: "",
    });
  }

  return NextResponse.json({ agents });
}
