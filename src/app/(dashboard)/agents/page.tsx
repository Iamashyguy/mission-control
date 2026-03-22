"use client";

import { useEffect, useState } from "react";
import { Bot, Server, Cpu, MemoryStick, HardDrive, Clock } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  emoji: string;
  model: string;
  status: string;
  lastActive: string;
  workspace: string;
}

interface SystemMetrics {
  cpu: number;
  ram: { used: number; total: number };
  disk: { used: number; total: number };
  uptime: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [system, setSystem] = useState<SystemMetrics | null>(null);

  useEffect(() => {
    fetch("/api/agents").then((r) => r.json()).then((d) => setAgents(d.agents || [])).catch(() => {});
    fetch("/api/system/stats").then((r) => r.json()).then(setSystem).catch(() => {});
    const interval = setInterval(() => {
      fetch("/api/system/stats").then((r) => r.json()).then(setSystem).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const getColor = (p: number) => (p < 60 ? "var(--positive)" : p < 85 ? "var(--warning)" : "var(--negative)");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Agents & System
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Monitor your AI agents and system resources
        </p>
      </div>

      {/* System Monitor */}
      {system && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(() => {
            const ramPct = system.ram.total > 0 ? (system.ram.used / system.ram.total) * 100 : 0;
            const diskPct = system.disk.total > 0 ? (system.disk.used / system.disk.total) * 100 : 0;
            const metrics = [
              { label: "CPU", value: `${system.cpu}%`, pct: system.cpu, icon: Cpu },
              { label: "RAM", value: `${system.ram.used.toFixed(1)}/${system.ram.total}GB`, pct: ramPct, icon: MemoryStick },
              { label: "Disk", value: `${system.disk.used}/${system.disk.total}GB`, pct: diskPct, icon: HardDrive },
              { label: "Uptime", value: system.uptime, pct: -1, icon: Clock },
            ];
            return metrics.map((m) => (
              <div
                key={m.label}
                className="rounded-xl p-4"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <m.icon style={{ width: "16px", height: "16px", color: "var(--text-muted)" }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    {m.label}
                  </span>
                </div>
                <div className="text-xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
                  {m.value}
                </div>
                {m.pct >= 0 && (
                  <div className="mt-2" style={{ height: "4px", backgroundColor: "var(--surface-elevated)", borderRadius: "2px" }}>
                    <div style={{ width: `${Math.min(100, m.pct)}%`, height: "100%", backgroundColor: getColor(m.pct), borderRadius: "2px" }} />
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      )}

      {/* Agent Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          <Bot className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Active Agents ({agents.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-xl p-5"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderLeft: "3px solid var(--accent)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: "24px" }}>{agent.emoji}</span>
                  <div>
                    <div className="font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
                      {agent.name}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {agent.id}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: agent.status === "active" ? "var(--positive)" : "var(--text-muted)",
                    }}
                  />
                  <span className="text-xs font-medium" style={{ color: agent.status === "active" ? "var(--positive)" : "var(--text-muted)" }}>
                    {agent.status}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Model</span>
                  <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                    {agent.model}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Workspace</span>
                  <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                    {agent.workspace}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
