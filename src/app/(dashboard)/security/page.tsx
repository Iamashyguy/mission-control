"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { Shield, CheckCircle, AlertTriangle, XCircle, RefreshCw, Lock, Globe, Server, Key, TrendingUp, Clock } from "lucide-react";

interface Check { name: string; status: "pass" | "warn" | "fail"; details: string; category: string; }
interface SecurityData {
  checks: Check[];
  score: { earned: number; total: number; percent: number; grade: string };
  summary: { pass: number; warn: number; fail: number };
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  auth: <Key className="w-4 h-4" />, config: <Server className="w-4 h-4" />,
  system: <Shield className="w-4 h-4" />, network: <Globe className="w-4 h-4" />,
};
const CATEGORY_LABELS: Record<string, string> = {
  auth: "Authentication & Keys", config: "Configuration", network: "Network", system: "System",
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  pass: { color: "var(--positive)", bg: "rgba(166, 227, 161, 0.1)", icon: <CheckCircle className="w-4 h-4" /> },
  warn: { color: "#f9e2af", bg: "rgba(249, 226, 175, 0.1)", icon: <AlertTriangle className="w-4 h-4" /> },
  fail: { color: "#f38ba8", bg: "rgba(243, 139, 168, 0.1)", icon: <XCircle className="w-4 h-4" /> },
};

function ScoreGauge({ percent, grade }: { percent: number; grade: string }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference * 0.75; // 270 degrees
  const gradeColor = grade === "A" ? "#a6e3a1" : grade === "B" ? "#89b4fa" : grade === "C" ? "#f9e2af" : "#f38ba8";

  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      <svg width="200" height="200" className="transform -rotate-[135deg]">
        {/* Background arc */}
        <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--border)" strokeWidth="12"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`} strokeLinecap="round" />
        {/* Score arc */}
        <circle cx="100" cy="100" r={radius} fill="none" stroke={gradeColor} strokeWidth="12"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={strokeDashoffset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-out" }} />
      </svg>
      <div className="absolute text-center">
        <div className="text-4xl font-bold" style={{ color: gradeColor }}>{grade}</div>
        <div className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{percent}%</div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>Security Score</div>
      </div>
    </div>
  );
}

function CategoryBar({ category, checks }: { category: string; checks: Check[] }) {
  const pass = checks.filter(c => c.status === "pass").length;
  const warn = checks.filter(c => c.status === "warn").length;
  const fail = checks.filter(c => c.status === "fail").length;
  const total = checks.length;
  const score = total > 0 ? Math.round(((pass * 2 + warn) / (total * 2)) * 100) : 0;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)" }}>
      <span style={{ color: "var(--accent)" }}>{CATEGORY_ICONS[category]}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{CATEGORY_LABELS[category]}</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{pass}/{total} passed</span>
        </div>
        <div className="flex gap-0.5 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border)" }}>
          {pass > 0 && <div style={{ width: `${(pass / total) * 100}%`, backgroundColor: "#a6e3a1" }} />}
          {warn > 0 && <div style={{ width: `${(warn / total) * 100}%`, backgroundColor: "#f9e2af" }} />}
          {fail > 0 && <div style={{ width: `${(fail / total) * 100}%`, backgroundColor: "#f38ba8" }} />}
        </div>
      </div>
      <span className="text-sm font-bold" style={{ color: score >= 80 ? "#a6e3a1" : score >= 50 ? "#f9e2af" : "#f38ba8" }}>{score}%</span>
    </div>
  );
}

export default function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [filter, setFilter] = useState<"all" | "pass" | "warn" | "fail">("all");

  const fetchData = () => {
    setLoading(true);
    fetch("/api/security").then(r => r.json()).then(d => {
      setData(d);
      setLastScan(new Date());
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  if (loading || !data) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Security</h1>
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-4" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          <p style={{ color: "var(--text-secondary)" }}>Running security scan...</p>
        </div>
      </div>
    </div>
  );

  const d = data;
  const categories = ["auth", "config", "network", "system"];
  const recommendations = d.checks.filter(c => c.status === "fail" || c.status === "warn").sort((a, b) => a.status === "fail" ? -1 : 1);
  const filteredChecks = filter === "all" ? d.checks : d.checks.filter(c => c.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Security Audit</h1>
          <p className="text-sm mt-1 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
            System security posture and configuration checks
            {lastScan && (
              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                <Clock className="w-3 h-3" /> Last scan: {lastScan.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}>
          <RefreshCw className="w-4 h-4" /> Re-scan
        </button>
      </div>

      {/* Top Row: Gauge + Stats + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Gauge */}
        <div className="rounded-xl p-6 flex flex-col items-center justify-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <ScoreGauge percent={d.score.percent} grade={d.score.grade} />
          <div className="flex gap-4 mt-4">
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: "#a6e3a1" }}>{d.summary.pass}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Pass</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: "#f9e2af" }}>{d.summary.warn}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Warn</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: "#f38ba8" }}>{d.summary.fail}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Fail</div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
            <TrendingUp className="w-4 h-4" /> Category Scores
          </h2>
          <div className="space-y-3">
            {categories.map(cat => {
              const catChecks = d.checks.filter(c => c.category === cat);
              return catChecks.length > 0 ? <CategoryBar key={cat} category={cat} checks={catChecks} /> : null;
            })}
          </div>
        </div>

        {/* Recommendations */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
            <AlertTriangle className="w-4 h-4" /> Recommendations ({recommendations.length})
          </h2>
          {recommendations.length === 0 ? (
            <div className="text-center py-6">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" style={{ color: "#a6e3a1" }} />
              <p className="text-sm" style={{ color: "#a6e3a1" }}>All checks passed! Great job 🎉</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {recommendations.map((r, i) => {
                const sc = STATUS_CONFIG[r.status];
                return (
                  <div key={i} className="p-2 rounded-lg" style={{ backgroundColor: sc.bg }}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: sc.color }}>{sc.icon}</span>
                      <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{r.name}</span>
                    </div>
                    <p className="text-xs mt-1 ml-6" style={{ color: "var(--text-muted)" }}>{r.details}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs + All Checks */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
            <Shield className="w-4 h-4" /> All Checks ({filteredChecks.length})
          </h2>
          <div className="flex gap-1">
            {(["all", "pass", "warn", "fail"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{
                  backgroundColor: filter === f ? "var(--accent)" : "var(--surface-elevated)",
                  color: filter === f ? "var(--bg)" : "var(--text-secondary)",
                }}>
                {f === "all" ? `All (${d.checks.length})` : f === "pass" ? `Pass (${d.summary.pass})` : f === "warn" ? `Warn (${d.summary.warn})` : `Fail (${d.summary.fail})`}
              </button>
            ))}
          </div>
        </div>

        {/* Grouped by category */}
        {categories.map(cat => {
          const catChecks = filteredChecks.filter(c => c.category === cat);
          if (catChecks.length === 0) return null;
          return (
            <div key={cat} className="mb-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
              </h3>
              <div className="space-y-1">
                {catChecks.map((check, i) => {
                  const sc = STATUS_CONFIG[check.status];
                  return (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)" }}>
                      <div style={{ color: sc.color }}>{sc.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{check.name}</div>
                        <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{check.details}</div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded shrink-0" style={{ backgroundColor: sc.bg, color: sc.color }}>
                        {check.status.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
