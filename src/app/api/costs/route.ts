import { NextResponse, NextRequest } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import {
  getDatabase,
  getCostSummary,
  getCostByAgent,
  getCostByModel,
  getDailyCost,
  getHourlyCost,
} from "@/lib/usage-queries";
import { initDatabase, saveSnapshot } from "@/lib/usage-collector";
import { calculateCost, normalizeModelId } from "@/lib/pricing";
import path from "path";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

const DB_PATH = path.join(process.cwd(), "data", "usage-tracking.db");

// Fixed subscription costs
const FIXED_COSTS = {
  subscription: 200, // Claude Max $200/mo
  minimax: 20, // MiniMax Plus $20/mo
  total: 220,
};

/**
 * Collect a fresh snapshot from openclaw status --json
 */
async function collectFreshSnapshot(): Promise<{ collected: number; error?: string }> {
  try {
    const { stdout } = await execAsync("openclaw status --json");
    const status = JSON.parse(stdout);
    const byAgent = status?.sessions?.byAgent || [];
    const db = initDatabase(DB_PATH);
    let count = 0;

    try {
      const now = Date.now();
      const date = new Date(now).toISOString().split("T")[0];
      const hour = new Date(now).getUTCHours();

      // Delete existing snapshots for this hour (avoid duplicates)
      db.prepare("DELETE FROM usage_snapshots WHERE date = ? AND hour = ?").run(date, hour);

      for (const agentGroup of byAgent) {
        const agentId = agentGroup.agentId || "unknown";
        const sessions = agentGroup.recent || [];

        // Aggregate tokens per model for this agent
        const modelMap = new Map<string, { input: number; output: number }>();
        for (const s of sessions) {
          const model = normalizeModelId(s.model || agentGroup.model || "unknown");
          const existing = modelMap.get(model) || { input: 0, output: 0 };
          existing.input += s.inputTokens || 0;
          existing.output += s.outputTokens || 0;
          modelMap.set(model, existing);
        }

        for (const [model, tokens] of modelMap) {
          const cost = calculateCost(model, tokens.input, tokens.output);
          saveSnapshot(db, {
            timestamp: now,
            date,
            hour,
            agentId,
            model,
            inputTokens: tokens.input,
            outputTokens: tokens.output,
            totalTokens: tokens.input + tokens.output,
            cost,
          });
          count++;
        }
      }
    } finally {
      db.close();
    }

    return { collected: count };
  } catch (error) {
    return { collected: 0, error: String(error) };
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const timeframe = searchParams.get("timeframe") || "30d";
  const days = parseInt(timeframe.replace(/\D/g, ""), 10) || 30;

  // Always try to collect fresh snapshot first
  await collectFreshSnapshot();

  const db = getDatabase(DB_PATH);

  if (!db) {
    // No usage DB yet — return subscription-based estimates
    return NextResponse.json({
      summary: {
        today: 0,
        yesterday: 0,
        thisMonth: FIXED_COSTS.total,
        lastMonth: 0,
        projected: FIXED_COSTS.total,
        budget: 250,
        fixedCosts: FIXED_COSTS,
      },
      byAgent: [
        { agent: "main", cost: FIXED_COSTS.subscription, tokens: 0, inputTokens: 0, outputTokens: 0, percentOfTotal: 91 },
        { agent: "discover", cost: FIXED_COSTS.minimax / 2, tokens: 0, inputTokens: 0, outputTokens: 0, percentOfTotal: 4.5 },
        { agent: "influencer", cost: 0, tokens: 0, inputTokens: 0, outputTokens: 0, percentOfTotal: 0 },
      ],
      byModel: [
        { model: "claude-opus-4-6", cost: FIXED_COSTS.subscription, tokens: 0, inputTokens: 0, outputTokens: 0, percentOfTotal: 91 },
        { model: "MiniMax-M2.7", cost: FIXED_COSTS.minimax, tokens: 0, inputTokens: 0, outputTokens: 0, percentOfTotal: 9 },
      ],
      daily: [],
      hourly: [],
      dataSource: "fixed-estimates",
      note: "Subscription-based ($200 Claude Max + $20 MiniMax). Token usage tracking active.",
    });
  }

  try {
    const summary = getCostSummary(db);
    const byAgent = getCostByAgent(db, days);
    const byModel = getCostByModel(db, days);
    const daily = getDailyCost(db, days);
    const hourly = getHourlyCost(db);

    // Add fixed subscription costs to the summary
    // Token-based costs are additional variable costs on top of subscription
    const totalApiCost = summary.thisMonth;

    db.close();

    return NextResponse.json({
      summary: {
        ...summary,
        budget: 250,
        fixedCosts: FIXED_COSTS,
        apiCostThisMonth: totalApiCost,
        totalCostThisMonth: FIXED_COSTS.total + totalApiCost,
      },
      byAgent,
      byModel,
      daily,
      hourly,
      dataSource: "live",
      note: `Base: $${FIXED_COSTS.total}/mo subscription. API costs shown are additional variable costs from token usage.`,
    });
  } catch (error) {
    console.error("Failed to read cost data:", error);
    if (db) db.close();
    return NextResponse.json({ error: "Failed to read cost data" }, { status: 500 });
  }
}
