"use client";

import { useEffect, useState } from "react";
import { Gamepad2, Bot, Activity, Cpu, RefreshCw } from "lucide-react";

interface AgentViz {
  id: string;
  name: string;
  emoji: string;
  status: "working" | "thinking" | "idle" | "error";
  model: string;
  color: string;
  desk: { x: number; y: number };
}

export default function Office3DPage() {
  const [agents, setAgents] = useState<AgentViz[]>([
    { id: "main", name: "Dev", emoji: "⚡", status: "working", model: "Opus 4.6", color: "#3B82F6", desk: { x: 20, y: 30 } },
    { id: "discover", name: "Discover Agent", emoji: "🔍", status: "idle", model: "MiniMax M2.7", color: "#32D74B", desk: { x: 55, y: 30 } },
    { id: "influencer", name: "AI Influencer", emoji: "🎭", status: "idle", model: "MiniMax M2.7", color: "#A855F7", desk: { x: 37, y: 60 } },
  ]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Animate status changes
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(a => ({
        ...a,
        status: a.id === "main" ? "working" : Math.random() > 0.7 ? "thinking" : "idle",
      })));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig: Record<string, { label: string; color: string; animation: string }> = {
    working: { label: "Working", color: "#32D74B", animation: "animate-pulse" },
    thinking: { label: "Thinking...", color: "#FFD60A", animation: "animate-bounce" },
    idle: { label: "Idle", color: "#8A8A8A", animation: "" },
    error: { label: "Error!", color: "#FF453A", animation: "animate-ping" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Virtual Office</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            🕐 {time.toLocaleTimeString()} — Agent activity visualization
          </p>
        </div>
        <div className="badge badge-info">2D Preview (3D coming soon)</div>
      </div>

      {/* Office Floor Plan */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "#0A0E17", border: "1px solid var(--border)", minHeight: "400px", position: "relative" }}>
        {/* Grid Background */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(59,130,246,0.1) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }} />

        {/* Room Label */}
        <div className="absolute top-4 left-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(59,130,246,0.3)" }}>
          Mission Control HQ
        </div>

        {/* Clock */}
        <div className="absolute top-4 right-4 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <span className="text-sm font-mono" style={{ color: "var(--accent)" }}>{time.toLocaleTimeString()}</span>
        </div>

        {/* Agent Desks */}
        {agents.map((agent) => {
          const sc = statusConfig[agent.status];
          return (
            <div
              key={agent.id}
              className="absolute transition-all duration-500"
              style={{ left: `${agent.desk.x}%`, top: `${agent.desk.y}%`, transform: "translate(-50%, -50%)" }}
            >
              {/* Desk */}
              <div className="relative" style={{
                width: "140px", padding: "16px", borderRadius: "12px",
                backgroundColor: "rgba(26,26,26,0.9)",
                border: `2px solid ${sc.color}`,
                boxShadow: `0 0 20px ${sc.color}40, 0 0 40px ${sc.color}20`,
              }}>
                {/* Status glow */}
                <div className={`absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full ${sc.animation}`} style={{ backgroundColor: sc.color }} />

                {/* Agent */}
                <div className="text-center">
                  <span className={`text-3xl ${sc.animation}`}>{agent.emoji}</span>
                  <div className="text-xs font-semibold mt-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{agent.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: sc.color }}>{sc.label}</div>
                  <div className="text-xs font-mono mt-1" style={{ color: "var(--text-muted)" }}>{agent.model}</div>
                </div>

                {/* Monitor */}
                <div className="mt-2 p-1.5 rounded" style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(59,130,246,0.2)" }}>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(59,130,246,0.1)" }}>
                    <div className={`h-full rounded-full transition-all ${agent.status === "working" ? "animate-pulse" : ""}`}
                      style={{ width: agent.status === "working" ? "75%" : agent.status === "thinking" ? "45%" : "10%", backgroundColor: sc.color }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Floor decorations */}
        <div className="absolute bottom-4 left-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#32D74B" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Working</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#FFD60A" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Thinking</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "#8A8A8A" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Idle</span>
          </div>
        </div>
      </div>

      {/* Agent Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {agents.map((agent) => {
          const sc = statusConfig[agent.status];
          return (
            <div key={agent.id} className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: `1px solid var(--border)`, borderLeft: `3px solid ${agent.color}` }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{agent.emoji}</span>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{agent.name}</div>
                  <div className="text-xs" style={{ color: sc.color }}>{sc.label}</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Model</span>
                  <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{agent.model}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Agent ID</span>
                  <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{agent.id}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center py-2">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          🎮 Full 3D office with React Three Fiber coming in a future update
        </p>
      </div>
    </div>
  );
}
