"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive, MemoryStick, Clock, Wifi, Shield, Server, Activity } from "lucide-react";

interface SystemStats {
  cpu: number;
  ram: { used: number; total: number };
  disk: { used: number; total: number };
  uptime: string;
  loadAvg?: number[];
  network?: { rx: number; tx: number };
  services?: number;
}

export function StatusBar() {
  const [stats, setStats] = useState<SystemStats>({
    cpu: 0,
    ram: { used: 0, total: 8 },
    disk: { used: 0, total: 500 },
    uptime: "0d 0h",
  });
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/system/stats");
        if (res.ok) {
          setStats(await res.json());
          setIsLive(true);
        }
      } catch {
        setIsLive(false);
      }
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
      <Icon style={{ width: "13px", height: "13px", color: color || "var(--text-muted)" }} />
      <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", color: "var(--text-muted)", textTransform: "uppercase" }}>
        {label}
      </span>
      <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{value}</span>
      {percent !== undefined && (
        <div
          style={{
            width: "40px",
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
              backgroundColor: color || getColor(percent),
              borderRadius: "2px",
              transition: "width 0.5s ease",
            }}
          />
        </div>
      )}
    </div>
  );

  const Divider = () => (
    <div style={{ width: "1px", height: "14px", backgroundColor: "var(--border)" }} />
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
        gap: "12px",
        zIndex: 40,
      }}
    >
      {/* Live indicator */}
      <div className="flex items-center gap-1.5">
        <div
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            backgroundColor: isLive ? "var(--positive)" : "var(--negative)",
            boxShadow: isLive ? "0 0 6px var(--positive)" : "none",
            animation: isLive ? "pulse 2s infinite" : "none",
          }}
        />
        <span style={{ fontSize: "10px", fontWeight: 600, color: isLive ? "var(--positive)" : "var(--negative)" }}>
          {isLive ? "Live" : "Offline"}
        </span>
      </div>

      <Divider />

      {/* CPU */}
      <Metric icon={Cpu} label="CPU" value={`${stats.cpu}%`} percent={stats.cpu} color={getColor(stats.cpu)} />

      <Divider />

      {/* RAM */}
      <Metric
        icon={MemoryStick}
        label="RAM"
        value={`${stats.ram.used.toFixed(1)}/${stats.ram.total}G`}
        percent={ramPercent}
        color={getColor(ramPercent)}
      />

      <Divider />

      {/* Disk */}
      <Metric
        icon={HardDrive}
        label="Disk"
        value={`${diskPercent.toFixed(0)}%`}
        percent={diskPercent}
        color={getColor(diskPercent)}
      />

      <Divider />

      {/* Load Average */}
      {stats.loadAvg && stats.loadAvg.length > 0 && (
        <>
          <div className="flex items-center gap-1.5" style={{ height: "24px" }}>
            <Activity style={{ width: "13px", height: "13px", color: "var(--text-muted)" }} />
            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", color: "var(--text-muted)" }}>LOAD</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
              {stats.loadAvg.map(l => l.toFixed(1)).join(" ")}
            </span>
          </div>
          <Divider />
        </>
      )}

      {/* Network I/O */}
      {stats.network && (
        <>
          <div className="flex items-center gap-1.5" style={{ height: "24px" }}>
            <Wifi style={{ width: "13px", height: "13px", color: "var(--text-muted)" }} />
            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", color: "var(--text-muted)" }}>NET</span>
            <span style={{ fontSize: "10px", color: "#4ADE80", fontFamily: "var(--font-mono)" }}>
              ↓{formatBytes(stats.network.rx)}
            </span>
            <span style={{ fontSize: "10px", color: "#60A5FA", fontFamily: "var(--font-mono)" }}>
              ↑{formatBytes(stats.network.tx)}
            </span>
          </div>
          <Divider />
        </>
      )}

      {/* Services */}
      {stats.services !== undefined && (
        <>
          <div className="flex items-center gap-1.5" style={{ height: "24px" }}>
            <Server style={{ width: "13px", height: "13px", color: "var(--text-muted)" }} />
            <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.5px", color: "var(--text-muted)" }}>SVC</span>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--positive)", fontFamily: "var(--font-mono)" }}>
              {stats.services}
            </span>
          </div>
          <Divider />
        </>
      )}

      {/* Uptime */}
      <div className="flex items-center gap-1.5 ml-auto">
        <Clock style={{ width: "12px", height: "12px", color: "var(--text-muted)" }} />
        <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
          {stats.uptime}
        </span>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}K`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)}M`;
  return `${(bytes / 1073741824).toFixed(1)}G`;
}
