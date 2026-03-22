"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { DollarSign, TrendingUp, Target, PieChart, RefreshCw, Zap, Database } from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

interface CostData {
  summary: {
    today: number;
    yesterday: number;
    thisMonth: number;
    lastMonth: number;
    projected: number;
    budget: number;
    fixedCosts: { subscription: number; minimax: number; total: number };
    apiCostThisMonth?: number;
    totalCostThisMonth?: number;
  };
  byAgent: Array<{ agent: string; cost: number; tokens: number; inputTokens: number; outputTokens: number; percentOfTotal: number }>;
  byModel: Array<{ model: string; cost: number; tokens: number; inputTokens: number; outputTokens: number; percentOfTotal: number }>;
  daily: Array<{ date: string; cost: number; input: number; output: number }>;
  hourly: Array<{ hour: string; cost: number }>;
  dataSource: string;
  note: string;
}

const AGENT_COLORS: Record<string, string> = {
  main: "#3B82F6",
  discover: "#FFD60A",
  influencer: "#A855F7",
};
const MODEL_COLORS = ["#3B82F6", "#0A84FF", "#32D74B", "#FFD60A", "#A855F7", "#FF6B6B"];

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function CostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    fetch(`/api/costs?timeframe=${timeRange}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); setRefreshing(false); })
      .catch(() => { setLoading(false); setRefreshing(false); });
  };

  useEffect(() => { fetchData(); }, [timeRange]);

  if (loading) return <div className="flex items-center justify-center h-64" style={{ color: "var(--text-muted)" }}>Loading costs...</div>;

  const d = data!;
  const s = d.summary;
  const budgetPercent = s.budget > 0 ? (s.fixedCosts.total / s.budget) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Cost Tracker
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {d.dataSource === "live" ? "📡 Live data from OpenClaw sessions" : "📊 Subscription-based estimates"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchData(true)}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} style={{ color: "var(--text-muted)" }} />
          </button>
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Today (Tokens)" value={`$${s.today.toFixed(2)}`} icon={<Zap />} iconColor="var(--accent)" subtitle={s.yesterday > 0 ? `Yesterday: $${s.yesterday.toFixed(2)}` : undefined} />
        <StatsCard title="This Month" value={`$${s.fixedCosts.total}`} icon={<DollarSign />} iconColor="var(--positive)" subtitle={`Fixed: $${s.fixedCosts.subscription} + $${s.fixedCosts.minimax}`} />
        <StatsCard title="API Costs" value={`$${(s.apiCostThisMonth || s.thisMonth || 0).toFixed(2)}`} icon={<Database />} iconColor="var(--warning)" subtitle="Variable token costs on top of subscription" />
        <StatsCard title="Budget" value={`${budgetPercent.toFixed(0)}%`} icon={<PieChart />} iconColor={budgetPercent > 90 ? "var(--error)" : "var(--positive)"} subtitle={`$${s.fixedCosts.total} / $${s.budget}`} />
      </div>

      {/* Budget Progress Bar */}
      <div className="rounded-xl p-5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Monthly Budget</span>
          <span className="text-sm font-mono font-bold" style={{ color: budgetPercent > 90 ? "var(--error)" : "var(--accent)" }}>
            ${s.fixedCosts.total} / ${s.budget}
          </span>
        </div>
        <div style={{ height: "10px", backgroundColor: "var(--surface-elevated)", borderRadius: "5px", overflow: "hidden" }}>
          <div style={{
            width: `${Math.min(100, budgetPercent)}%`,
            height: "100%",
            borderRadius: "5px",
            transition: "width 0.8s ease",
            background: budgetPercent > 90 ? "linear-gradient(90deg, var(--warning), var(--error))"
              : budgetPercent > 70 ? "linear-gradient(90deg, var(--accent), var(--warning))"
              : "linear-gradient(90deg, var(--positive), var(--accent))",
          }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{budgetPercent.toFixed(0)}% used</span>
          <span className="text-xs" style={{ color: "var(--positive)" }}>💰 Saving $980/mo vs API-only ($1,200/mo)</span>
        </div>
      </div>

      {/* Token Usage by Agent — REAL DATA */}
      {d.byAgent.length > 0 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Token Usage by Agent
          </h2>
          <div className="space-y-3">
            {d.byAgent.map((a) => (
              <div key={a.agent} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: AGENT_COLORS[a.agent] || "#6B7280" }} />
                <span className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>{a.agent}</span>
                <div className="text-right">
                  <div className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                    {formatTokens(a.inputTokens)} in / {formatTokens(a.outputTokens)} out
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    API cost: ${a.cost.toFixed(4)} ({a.percentOfTotal.toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Token Trend — REAL DATA */}
      {d.daily && d.daily.length > 0 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Daily Token Usage Trend
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={d.daily}>
              <defs>
                <linearGradient id="tokenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#8A8A8A", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8A8A8A", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                formatter={(value) => [`$${value}`, "API Cost"]}
              />
              <Area type="monotone" dataKey="cost" stroke="#3B82F6" fill="url(#tokenGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart — Cost by Provider */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Subscription Split
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
                <Cell fill="#3B82F6" />
                <Cell fill="#0A84FF" />
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                formatter={(value) => [`$${value}/mo`, "Cost"]}
              />
            </RechartsPie>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart — Token Usage by Model (REAL DATA) */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Tokens by Model
          </h2>
          {d.byModel.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={d.byModel} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="model" tick={{ fill: "#8A8A8A", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8A8A8A", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => formatTokens(v)} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: "8px", color: "#fff", fontSize: "12px" }}
                  formatter={(value) => [formatTokens(value as number), "Tokens"]}
                />
                <Bar dataKey="tokens" name="Total Tokens" radius={[4, 4, 0, 0]}>
                  {d.byModel.map((_, i) => (
                    <Cell key={i} fill={MODEL_COLORS[i % MODEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--text-muted)" }}>
              Token data will appear after usage is collected
            </div>
          )}
        </div>
      </div>

      {/* Detailed Breakdown */}
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
            {d.note && (
              <p className="text-xs mt-3 italic" style={{ color: "var(--text-muted)" }}>
                ℹ️ {d.note}
              </p>
            )}
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
