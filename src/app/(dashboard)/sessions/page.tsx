"use client";

import { useEffect, useState } from "react";
import { History, Bot, MessageSquare, Radio } from "lucide-react";

interface SessionInfo {
  id: string;
  agent: string;
  channel: string;
  type: string;
  lastActive: string;
  size: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d) => { setSessions(d.sessions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const channelColors: Record<string, string> = {
    telegram: "#229ED9",
    discord: "#5865F2",
    whatsapp: "#25D366",
    signal: "#3A76F0",
    slack: "#4A154B",
  };

  const agentEmoji: Record<string, string> = {
    main: "⚡",
    discover: "🔍",
    influencer: "🎭",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Sessions
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {sessions.length} sessions tracked
        </p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-xl animate-pulse" style={{ backgroundColor: "var(--card)" }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12">
          <History className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-lg" style={{ color: "var(--text-secondary)" }}>No sessions found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-4 p-4 rounded-xl transition-colors"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              {/* Agent icon */}
              <span style={{ fontSize: "20px" }}>{agentEmoji[s.agent] || "🤖"}</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {s.agent}
                  </span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: `${channelColors[s.channel] || "var(--accent)"}20`,
                      color: channelColors[s.channel] || "var(--accent)",
                    }}
                  >
                    {s.channel}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)" }}>
                    {s.type}
                  </span>
                </div>
                <div className="text-xs font-mono mt-1 truncate" style={{ color: "var(--text-muted)" }}>
                  {s.id}
                </div>
              </div>

              {/* Meta */}
              <div className="text-right shrink-0">
                <div className="text-xs" style={{ color: "var(--text-secondary)" }}>{timeAgo(s.lastActive)}</div>
                <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{formatSize(s.size)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
