"use client";

import { useEffect, useState } from "react";
import {
  Clock, Play, AlertTriangle, CheckCircle, XCircle,
  Timer, Bot, Cpu
} from "lucide-react";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  nextRun: string;
  lastRun: string;
  status: string;
  target: string;
  agentId: string;
  model: string;
}

export default function CronsPage() {
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [systemCrons, setSystemCrons] = useState<CronJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/crons")
      .then((r) => r.json())
      .then((d) => {
        setCrons(d.crons || []);
        setSystemCrons(d.systemCrons || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const okCount = crons.filter((c) => c.status === "ok").length;
  const errorCount = crons.filter((c) => c.status === "error").length;

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Cron Manager
        </h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-xl" style={{ backgroundColor: "var(--card)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Cron Manager
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {crons.length} OpenClaw crons · {systemCrons.length} system crons
        </p>
      </div>

      {/* Summary Pills */}
      <div className="flex gap-3 flex-wrap">
        <StatusPill icon={<Clock />} label="Total" value={crons.length} color="var(--accent)" />
        <StatusPill icon={<CheckCircle />} label="Healthy" value={okCount} color="var(--positive)" />
        {errorCount > 0 && (
          <StatusPill icon={<XCircle />} label="Errors" value={errorCount} color="var(--error)" />
        )}
      </div>

      {/* OpenClaw Crons */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <Bot className="w-4 h-4" /> OpenClaw Scheduled Tasks
        </h2>
        {crons.map((cron) => (
          <CronCard key={cron.id} cron={cron} />
        ))}
        {crons.length === 0 && (
          <p className="text-sm py-4 text-center" style={{ color: "var(--text-muted)" }}>
            No OpenClaw crons found. Check `openclaw crons list`.
          </p>
        )}
      </div>

      {/* System Crons */}
      {systemCrons.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
            <Cpu className="w-4 h-4" /> System Crontab
          </h2>
          {systemCrons.map((cron) => (
            <CronCard key={cron.id} cron={cron} isSystem />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <span style={{ color }}>{icon}</span>
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span className="font-bold" style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

function CronCard({ cron, isSystem }: { cron: CronJob; isSystem?: boolean }) {
  const statusConfig = {
    ok: { icon: <CheckCircle className="w-4 h-4" />, color: "var(--positive)", label: "Healthy" },
    error: { icon: <XCircle className="w-4 h-4" />, color: "var(--error)", label: "Error" },
    active: { icon: <Play className="w-4 h-4" />, color: "var(--positive)", label: "Active" },
    disabled: { icon: <AlertTriangle className="w-4 h-4" />, color: "var(--text-muted)", label: "Disabled" },
  };
  const st = statusConfig[cron.status as keyof typeof statusConfig] || statusConfig.active;

  // Determine agent badge color
  const agentColors: Record<string, string> = {
    main: "var(--accent)",
    discover: "var(--info)",
    "-": "var(--text-muted)",
  };

  return (
    <div
      className="rounded-xl p-4 transition-colors"
      style={{
        backgroundColor: "var(--card)",
        border: `1px solid ${cron.status === "error" ? "var(--error)" : "var(--border)"}`,
        borderLeft: `3px solid ${st.color}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Name + Status */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
              {cron.name}
            </span>
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: `color-mix(in srgb, ${st.color} 15%, transparent)`, color: st.color }}>
              {st.icon}
              {st.label}
            </span>
          </div>

          {/* Schedule */}
          <div className="flex items-center gap-1.5 mb-2">
            <Timer className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
              {cron.schedule}
            </span>
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-4 flex-wrap text-xs" style={{ color: "var(--text-muted)" }}>
            {cron.nextRun && (
              <span>Next: <span style={{ color: "var(--text-secondary)" }}>{cron.nextRun}</span></span>
            )}
            {cron.lastRun && (
              <span>Last: <span style={{ color: "var(--text-secondary)" }}>{cron.lastRun}</span></span>
            )}
            {!isSystem && cron.agentId && cron.agentId !== "-" && (
              <span className="flex items-center gap-1">
                <Bot className="w-3 h-3" />
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `color-mix(in srgb, ${agentColors[cron.agentId] || "var(--accent)"} 15%, transparent)`,
                    color: agentColors[cron.agentId] || "var(--accent)",
                  }}
                >
                  {cron.agentId}
                </span>
              </span>
            )}
            {cron.model && !isSystem && (
              <span className="font-mono">{cron.model.includes("/") ? cron.model.split("/").pop() : cron.model}</span>
            )}
          </div>
        </div>

        {/* ID badge */}
        <span className="text-xs font-mono shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>
          {cron.id.slice(0, 8)}
        </span>
      </div>
    </div>
  );
}
