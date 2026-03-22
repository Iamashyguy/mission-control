"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw, ExternalLink } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  level: "critical" | "high" | "low" | "info";
  source: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

interface NotifData {
  notifications: Notification[];
  summary: { total: number; unread: number; critical: number; high: number; low: number; info: number };
}

const LEVEL_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  critical: { color: "var(--negative)", bg: "var(--negative-soft)", icon: <AlertTriangle className="w-4 h-4" />, label: "CRITICAL" },
  high: { color: "var(--warning)", bg: "var(--warning-soft)", icon: <AlertCircle className="w-4 h-4" />, label: "HIGH" },
  low: { color: "var(--info)", bg: "var(--info-soft)", icon: <Info className="w-4 h-4" />, label: "LOW" },
  info: { color: "var(--text-muted)", bg: "var(--surface-elevated)", icon: <CheckCircle className="w-4 h-4" />, label: "INFO" },
};

export default function NotificationsPage() {
  const [data, setData] = useState<NotifData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const fetchData = () => {
    setLoading(true);
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Notifications</h1>
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}><div className="h-4 rounded w-1/3 mb-2" style={{ backgroundColor: "var(--border)" }} /><div className="h-3 rounded w-2/3" style={{ backgroundColor: "var(--border)" }} /></div>)}</div>
      </div>
    );
  }

  const d = data!;
  const filtered = d.notifications.filter((n) => filter === "all" || n.level === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Notifications</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>System alerts, errors, and status updates</p>
        </div>
        <button onClick={fetchData} className="btn-primary text-sm" style={{ padding: "8px 16px" }}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total" value={d.summary.total} icon={<Bell />} iconColor="var(--accent)" subtitle={`${d.summary.unread} unread`} />
        <StatsCard title="Critical" value={d.summary.critical} icon={<AlertTriangle />} iconColor={d.summary.critical > 0 ? "var(--negative)" : "var(--positive)"} subtitle={d.summary.critical > 0 ? "Needs attention!" : "All clear"} />
        <StatsCard title="High" value={d.summary.high} icon={<AlertCircle />} iconColor="var(--warning)" subtitle="Important alerts" />
        <StatsCard title="Info" value={d.summary.low + d.summary.info} icon={<Info />} iconColor="var(--info)" subtitle="Low priority" />
      </div>

      <div className="flex items-center gap-2">
        {["all", "critical", "high", "low", "info"].map((f) => {
          const lc = LEVEL_CONFIG[f] || { color: "var(--accent)", bg: "var(--accent-soft)" };
          return (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
              style={{
                backgroundColor: filter === f ? (f === "all" ? "var(--accent-soft)" : lc.bg) : "var(--surface-elevated)",
                color: filter === f ? (f === "all" ? "var(--accent)" : lc.color) : "var(--text-muted)",
                border: `1px solid ${filter === f ? (f === "all" ? "var(--accent)" : lc.color) : "var(--border)"}`,
              }}
            >
              {f === "all" ? `All (${d.summary.total})` : `${f} (${d.summary[f as keyof typeof d.summary] || 0})`}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        {filtered.map((n) => {
          const lc = LEVEL_CONFIG[n.level];
          return (
            <div key={n.id} className="flex items-start gap-3 p-4 rounded-xl transition-colors"
              style={{
                backgroundColor: n.read ? "var(--card)" : "var(--surface-elevated)",
                border: `1px solid ${n.read ? "var(--border)" : lc.color}`,
                opacity: n.read ? 0.7 : 1,
              }}
            >
              <div className="mt-0.5 flex-shrink-0" style={{ color: lc.color }}>{lc.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{n.title}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: lc.bg, color: lc.color }}>{lc.label}</span>
                  {!n.read && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--accent)" }} />}
                </div>
                <p className="text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>{n.message}</p>
                <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>{n.source}</span>
                  <span>•</span>
                  <span>{new Date(n.timestamp).toLocaleString()}</span>
                  {n.link && (
                    <a href={n.link} className="flex items-center gap-1 ml-auto" style={{ color: "var(--accent)" }}>
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No notifications for this filter</p>
          </div>
        )}
      </div>
    </div>
  );
}
