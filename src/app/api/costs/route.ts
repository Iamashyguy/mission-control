import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // For now, return our known fixed costs
  // TODO: Read from OpenClaw session DBs for actual token usage
  return NextResponse.json({
    summary: {
      today: 0,
      thisMonth: 220,
      projected: 220,
      budget: 250,
    },
    byAgent: [
      { agent: "Dev (Main)", cost: 200, tokens: 0 },
      { agent: "Discover Agent", cost: 10, tokens: 0 },
      { agent: "Crons (MiniMax)", cost: 10, tokens: 0 },
    ],
    byModel: [
      { model: "claude-opus-4-6", cost: 200, percentage: 91 },
      { model: "minimax-m2.7", cost: 20, percentage: 9 },
    ],
  });
}
