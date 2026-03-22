"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive, MemoryStick, Clock } from "lucide-react";

interface SystemStats {
  cpu: number;
  ram: { used: number; total: number };
  disk: { used: number; total: number };
  uptime: string;
}

export function StatusBar() {
  const [stats, setStats] = useState<SystemStats>({
    cpu: 0,
    ram: { used: 0, total: 8 },
    disk: { used: 0, total: 500 },
    uptime: "0d 0h",
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/system/stats");
        if (res.ok) setStats(await res.json());
      } catch {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const getColor = (percent: number) =>
    percent < 60 ? "var(--positive)" : percent < 85 ? "var(--warning)" : "var(--negative)";

  const ramPercent = stats.ram.total > 0 ? (stats.ram.used / stats.ram.total) * 100 : 0;
  const diskPercent = stats.disk.total > 0 ? (stats.disk.used / stats.disk.total) * 100 : 0;

  const Metric = ({
    icon: Icon,
    label,
    value,
    percent,
    color,
  }: {
    icon: React.ComponentType<{ style?: React.CSSProperties }>;
    label: string;
    value: string;
    percent?: number;
    color?: string;
  }) => (
    <div className="flex items-center gap-1.5" style={{ height: "24px" }}>
      <Icon style={{ width: "14px", height: "14px", color: "var(--text-muted)" }} />
      <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "1px", color: "var(--text-muted)" }}>
        {label}
      </span>
      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)" }}>{value}</span>
      {percent !== undefined && (
        <div
          style={{
            width: "48px",
            height: "4px",
            backgroundColor: "var(--surface-elevated)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, percent)}%`,
              height: "100%",
              backgroundColor: color,
              borderRadius: "2px",
            }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "var(--statusbar-height)",
        backgroundColor: "var(--surface)",
        borderTop: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px 0 272px",
        gap: "16px",
        zIndex: 40,
      }}
    >
      <Metric icon={Cpu} label="CPU" value={`${stats.cpu}%`} percent={stats.cpu} color={getColor(stats.cpu)} />
      <Metric
        icon={MemoryStick}
        label="RAM"
        value={`${stats.ram.used.toFixed(1)}/${stats.ram.total}GB`}
        percent={ramPercent}
        color={getColor(ramPercent)}
      />
      <Metric
        icon={HardDrive}
        label="DISK"
        value={`${diskPercent.toFixed(0)}%`}
        percent={diskPercent}
        color={getColor(diskPercent)}
      />
      <div style={{ width: "1px", height: "16px", backgroundColor: "var(--border)" }} />
      <div className="flex items-center gap-1">
        <Clock style={{ width: "12px", height: "12px", color: "var(--text-muted)" }} />
        <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--text-muted)" }}>
          Uptime: {stats.uptime}
        </span>
      </div>
    </div>
  );
}
