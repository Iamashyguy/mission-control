"use client";

import { useEffect, useState } from "react";
import { Activity, GitCommit, Brain, AlertTriangle, Lightbulb } from "lucide-react";

interface ActivityEntry {
  id: string;
  timestamp: string;
  type: "decision" | "event" | "learning" | "error" | "cron";
  content: string;
  source: string;
}

const typeConfig = {
  decision: { icon: GitCommit, color: "var(--accent)", label: "Decision" },
  event: { icon: Activity, color: "var(--info)", label: "Event" },
  learning: { icon: Lightbulb, color: "var(--positive)", label: "Learning" },
  error: { icon: AlertTriangle, color: "var(--error)", label: "Error" },
  cron: { icon: Brain, color: "var(--warning)", label: "Cron" },
};

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetch("/api/activity")
      .then((r) => r.json())
      .then((d) => { setActivities(d.activities || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? activities : activities.filter((a) => a.type === filter);

  // Group by date
  const grouped = new Map<string, ActivityEntry[]>();
  for (const a of filtered) {
    const group = grouped.get(a.timestamp) || [];
    group.push(a);
    grouped.set(a.timestamp, group);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Activity Feed
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Recent events, decisions, and learnings from memory files
          </p>
        </div>
        <div className="flex gap-1" style={{ backgroundColor: "var(--card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          {["all", "decision", "event", "learning", "error"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize"
              style={{
                backgroundColor: filter === f ? "var(--accent)" : "transparent",
                color: filter === f ? "white" : "var(--text-muted)",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--card)" }} />
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>No activity yet</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Activities will appear from daily memory files</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([date, items]) => (
            <div key={date}>
              <div className="sticky top-0 z-10 py-2 mb-2" style={{ backgroundColor: "var(--background)" }}>
                <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full" style={{ backgroundColor: "var(--card)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                  {date}
                </span>
              </div>
              <div className="space-y-2 pl-4" style={{ borderLeft: "2px solid var(--border)" }}>
                {items.map((a) => {
                  const config = typeConfig[a.type] || typeConfig.event;
                  const Icon = config.icon;
                  return (
                    <div
                      key={a.id}
                      className="relative flex items-start gap-3 p-3 rounded-lg -ml-[21px]"
                      style={{ backgroundColor: "var(--card)" }}
                    >
                      <div
                        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `color-mix(in srgb, ${config.color} 15%, transparent)` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                          {a.content}
                        </div>
                        <div className="text-xs mt-1 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                          <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: `color-mix(in srgb, ${config.color} 10%, transparent)`, color: config.color }}>
                            {config.label}
                          </span>
                          <span>{a.source}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
