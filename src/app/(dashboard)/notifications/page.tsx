"use client";

import { useEffect, useState } from "react";
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle, RefreshCw, Trash2, CheckCheck, Clock, Filter } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  priority: "critical" | "high" | "low" | "info";
  source: string;
  sourceUrl?: string;
  read: boolean;
  timestamp: string;
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  critical: { color: "#f38ba8", bg: "rgba(243, 139, 168, 0.1)", icon: <AlertCircle className="w-4 h-4" />, label: "Critical" },
  high: { color: "#f9e2af", bg: "rgba(249, 226, 175, 0.1)", icon: <AlertTriangle className="w-4 h-4" />, label: "High" },
  low: { color: "#89b4fa", bg: "rgba(137, 180, 250, 0.1)", icon: <Info className="w-4 h-4" />, label: "Low" },
  info: { color: "#a6adc8", bg: "rgba(166, 173, 200, 0.05)", icon: <Info className="w-4 h-4" />, label: "Info" },
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function groupByTime(notifs: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  const groups: { label: string; items: Notification[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Older", items: [] },
  ];

  notifs.forEach(n => {
    const t = new Date(n.timestamp).getTime();
    if (t >= today) groups[0].items.push(n);
    else if (t >= yesterday) groups[1].items.push(n);
    else groups[2].items.push(n);
  });

  return groups.filter(g => g.items.length > 0);
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "critical" | "high" | "low" | "unread">("all");

  const fetchData = () => {
    setLoading(true);
    fetch("/api/notifications").then(r => r.json()).then(d => {
      const raw = Array.isArray(d) ? d : d.notifications || [];
      // Normalize: API uses "level", page uses "priority"
      const normalized = raw.map((n: Record<string, unknown>) => ({
        ...n,
        priority: n.priority || n.level || "info",
        read: n.read ?? false,
        source: n.source || "System",
      })) as Notification[];
      setNotifs(normalized);
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const dismissAll = () => setNotifs([]);

  const unreadCount = notifs.filter(n => !n.read).length;
  const criticalCount = notifs.filter(n => n.priority === "critical").length;
  const highCount = notifs.filter(n => n.priority === "high").length;

  const filtered = tab === "all" ? notifs :
    tab === "unread" ? notifs.filter(n => !n.read) :
    notifs.filter(n => n.priority === tab);

  const grouped = groupByTime(filtered);

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Notifications</h1>
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <Bell className="w-6 h-6" style={{ color: "var(--accent)" }} />
            Notifications
            {unreadCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: "#f38ba8", color: "white" }}>
                {unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {notifs.length} total · {criticalCount} critical · {highCount} high priority
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={markAllRead} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
            <CheckCheck className="w-3 h-3" /> Mark all read
          </button>
          <button onClick={fetchData} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}>
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          { key: "all", label: "All", count: notifs.length, color: "var(--accent)" },
          { key: "unread", label: "Unread", count: unreadCount, color: "#cba6f7" },
          { key: "critical", label: "Critical", count: criticalCount, color: "#f38ba8" },
          { key: "high", label: "High", count: highCount, color: "#f9e2af" },
          { key: "low", label: "Low", count: notifs.filter(n => n.priority === "low" || n.priority === "info").length, color: "#89b4fa" },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className="p-3 rounded-xl text-center transition-all"
            style={{
              backgroundColor: tab === t.key ? "var(--surface-elevated)" : "var(--card)",
              border: `1px solid ${tab === t.key ? t.color : "var(--border)"}`,
            }}>
            <div className="text-xl font-bold" style={{ color: t.color }}>{t.count}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{t.label}</div>
          </button>
        ))}
      </div>

      {/* Notification List */}
      {grouped.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <Bell className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {tab === "all" ? "No notifications" : `No ${tab} notifications`}
          </p>
        </div>
      ) : (
        grouped.map(group => (
          <div key={group.label}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
              <Clock className="w-3 h-3" /> {group.label}
            </h3>
            <div className="space-y-2">
              {group.items.map(n => {
                const pc = PRIORITY_CONFIG[n.priority];
                return (
                  <div key={n.id} onClick={() => markRead(n.id)}
                    className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all"
                    style={{
                      backgroundColor: n.read ? "var(--card)" : pc.bg,
                      border: `1px solid ${n.read ? "var(--border)" : pc.color}40`,
                      opacity: n.read ? 0.7 : 1,
                    }}>
                    <div className="shrink-0 mt-0.5" style={{ color: pc.color }}>{pc.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{n.title}</span>
                        {!n.read && <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pc.color }} />}
                      </div>
                      <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{n.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: pc.bg, color: pc.color }}>{pc.label}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{n.source}</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo(n.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
