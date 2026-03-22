"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { DollarSign, TrendingUp, Target, PieChart } from "lucide-react";

interface CostData {
  summary: {
    today: number;
    thisMonth: number;
    projected: number;
    budget: number;
  };
  byAgent: Array<{ agent: string; cost: number; tokens: number }>;
  byModel: Array<{ model: string; cost: number; percentage: number }>;
}

export default function CostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    fetch(`/api/costs?range=${timeRange}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [timeRange]);

  const d = data || {
    summary: { today: 0, thisMonth: 220, projected: 220, budget: 250 },
    byAgent: [],
    byModel: [],
  };

  const budgetPercent = d.summary.budget > 0 ? (d.summary.thisMonth / d.summary.budget) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Cost Tracker
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Track spending across agents and models
          </p>
        </div>
        <div className="flex gap-1" style={{ backgroundColor: "var(--card-elevated)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          {(["7d", "30d", "90d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={{
                backgroundColor: timeRange === range ? "var(--accent)" : "transparent",
                color: timeRange === range ? "white" : "var(--text-muted)",
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Today" value={`$${d.summary.today.toFixed(2)}`} icon={<DollarSign />} iconColor="var(--accent)" />
        <StatsCard title="This Month" value={`$${d.summary.thisMonth.toFixed(2)}`} icon={<TrendingUp />} iconColor="var(--positive)" />
        <StatsCard title="Projected" value={`$${d.summary.projected.toFixed(2)}`} icon={<Target />} iconColor="var(--info)" />
        <StatsCard title="Budget" value={`${budgetPercent.toFixed(0)}%`} icon={<PieChart />} iconColor={budgetPercent > 90 ? "var(--error)" : "var(--positive)"} subtitle={`$${d.summary.thisMonth.toFixed(0)} / $${d.summary.budget}`} />
      </div>

      {/* Cost by Agent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Cost by Agent
          </h2>
          {d.byAgent.length > 0 ? (
            <div className="space-y-3">
              {d.byAgent.map((item) => (
                <div key={item.agent} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{item.agent}</span>
                  </div>
                  <span className="text-sm font-medium font-mono" style={{ color: "var(--text-secondary)" }}>
                    ${item.cost.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Cost data from subscription model — $220/mo fixed
              </p>
              <div className="mt-4 space-y-2">
                <CostRow label="Claude Max (Subscription)" value="$200/mo" color="var(--accent)" />
                <CostRow label="MiniMax M2.7 (Plus)" value="$20/mo" color="var(--info)" />
              </div>
            </div>
          )}
        </div>

        {/* Cost by Model */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Cost Breakdown
          </h2>
          <div className="space-y-3">
            <CostRow label="Main Chat (Opus 4.6)" value="Subscription" color="var(--accent)" pct={91} />
            <CostRow label="Analytical Crons (Sonnet 4.6)" value="Subscription" color="var(--positive)" pct={0} />
            <CostRow label="Mechanical Crons (MiniMax)" value="$20/mo" color="var(--info)" pct={9} />
            <CostRow label="Discover Agent (MiniMax)" value="Included" color="var(--warning)" pct={0} />
          </div>
          <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Total Monthly</span>
              <span className="text-lg font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
                $220/mo
              </span>
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--positive)" }}>
              ↓ $980/mo savings vs API-only ($1,200)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CostRow({ label, value, color, pct }: { label: string; value: string; color: string; pct?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: color }} />
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
        </div>
        <span className="text-sm font-medium font-mono" style={{ color: "var(--text-secondary)" }}>{value}</span>
      </div>
      {pct !== undefined && pct > 0 && (
        <div style={{ height: "4px", backgroundColor: "var(--surface-elevated)", borderRadius: "2px", marginLeft: "18px" }}>
          <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: "2px" }} />
        </div>
      )}
    </div>
  );
}
