"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { DollarSign, TrendingUp, Target, PieChart } from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart — Cost by Provider */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Cost by Provider
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <RechartsPie>
              <Pie
                data={[
                  { name: "Claude Max", value: 200, color: "#3B82F6" },
                  { name: "MiniMax Plus", value: 20, color: "#0A84FF" },
                ]}
                cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                dataKey="value" paddingAngle={3} strokeWidth={0}
                label={({ name, value }) => `${name}: $${value}`}
              >
                {[
                  { color: "#3B82F6" },
                  { color: "#0A84FF" },
                ].map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                formatter={(value) => [`$${value}/mo`, "Cost"]}
              />
            </RechartsPie>
          </ResponsiveContainer>
          <div className="text-center text-xs mt-2" style={{ color: "var(--positive)" }}>
            ↓ $980/mo savings vs API-only ($1,200)
          </div>
        </div>

        {/* Bar Chart — Cost by Usage Category */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Cost by Category
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[
              { category: "Main Chat", cost: 200, fill: "#3B82F6" },
              { category: "Analytical Crons", cost: 0, fill: "#32D74B" },
              { category: "Mechanical Crons", cost: 10, fill: "#0A84FF" },
              { category: "Discover Agent", cost: 5, fill: "#FFD60A" },
              { category: "Heartbeats", cost: 3, fill: "#A855F7" },
              { category: "Subagents", cost: 2, fill: "#FF6B6B" },
            ]} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="category" tick={{ fill: "#8A8A8A", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8A8A8A", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                formatter={(value) => [`$${value}/mo`, "Cost"]}
              />
              <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                {[
                  "#3B82F6", "#32D74B", "#0A84FF", "#FFD60A", "#A855F7", "#FF6B6B"
                ].map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Breakdown Table */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Detailed Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <CostRow label="Main Chat (Opus 4.6)" value="Subscription" color="#3B82F6" pct={91} />
            <CostRow label="Analytical Crons (Sonnet 4.6)" value="Subscription" color="#32D74B" pct={0} />
            <CostRow label="Mechanical Crons (MiniMax)" value="$20/mo" color="#0A84FF" pct={9} />
            <CostRow label="Discover Agent (MiniMax)" value="Included" color="#FFD60A" pct={0} />
          </div>
          <div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Total Monthly</span>
                <span className="text-xl font-bold font-mono" style={{ color: "var(--accent)" }}>$220/mo</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Claude Max Subscription</span>
                <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>$200</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>MiniMax Plus Plan</span>
                <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>$20</span>
              </div>
              <div className="mt-3 pt-2 text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--positive)" }}>
                💰 Saving $980/mo compared to API-only ($1,200/mo)
              </div>
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
