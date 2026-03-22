"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { Shield, CheckCircle, AlertTriangle, XCircle, RefreshCw, Lock, Globe, Server, Key } from "lucide-react";

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

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  pass: { color: "var(--positive)", bg: "var(--positive-soft)", icon: <CheckCircle className="w-4 h-4" /> },
  warn: { color: "var(--warning)", bg: "var(--warning-soft)", icon: <AlertTriangle className="w-4 h-4" /> },
  fail: { color: "var(--negative)", bg: "var(--negative-soft)", icon: <XCircle className="w-4 h-4" /> },
};

export default function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => { setLoading(true); fetch("/api/security").then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Security</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="rounded-xl p-6 animate-pulse" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}><div className="h-8 rounded w-1/2" style={{ backgroundColor: "var(--border)" }} /></div>)}</div>
    </div>
  );

  const d = data!;
  const gradeColor = d.score.grade === "A" ? "var(--positive)" : d.score.grade === "B" ? "var(--info)" : d.score.grade === "C" ? "var(--warning)" : "var(--negative)";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Security Audit</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>System security posture and configuration checks</p>
        </div>
        <button onClick={fetchData} className="btn-primary text-sm" style={{ padding: "8px 16px" }}><RefreshCw className="w-4 h-4" /> Re-scan</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="text-5xl font-bold mb-1" style={{ color: gradeColor, fontFamily: "var(--font-heading)" }}>{d.score.grade}</div>
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{d.score.percent}% ({d.score.earned}/{d.score.total})</div>
          <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Security Score</div>
        </div>
        <StatsCard title="Passed" value={d.summary.pass} icon={<CheckCircle />} iconColor="var(--positive)" subtitle="Checks passed" />
        <StatsCard title="Warnings" value={d.summary.warn} icon={<AlertTriangle />} iconColor="var(--warning)" subtitle="Needs attention" />
        <StatsCard title="Failed" value={d.summary.fail} icon={<XCircle />} iconColor={d.summary.fail > 0 ? "var(--negative)" : "var(--positive)"} subtitle={d.summary.fail > 0 ? "Action required!" : "All clear"} />
      </div>

      {/* Checks grouped by category */}
      {["auth", "config", "network", "system"].map((cat) => {
        const catChecks = d.checks.filter(c => c.category === cat);
        if (catChecks.length === 0) return null;
        return (
          <div key={cat} className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
              <span style={{ color: "var(--accent)" }}>{CATEGORY_ICONS[cat]}</span>
              {cat === "auth" ? "Authentication & Keys" : cat === "config" ? "Configuration" : cat === "network" ? "Network" : "System"}
            </h2>
            <div className="space-y-2">
              {catChecks.map((check) => {
                const sc = STATUS_CONFIG[check.status];
                return (
                  <div key={check.name} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)" }}>
                    <div style={{ color: sc.color }}>{sc.icon}</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{check.name}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{check.details}</div>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: sc.bg, color: sc.color }}>
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
  );
}
