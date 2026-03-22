"use client";

import { useEventStream, SystemEvent } from "@/hooks/useEventStream";
import { Cpu, HardDrive, Clock, Wifi, WifiOff, Activity } from "lucide-react";

function Sparkline({ data, color, height = 40, width = 200 }: { data: number[]; color: string; height?: number; width?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 100);
  const min = 0;
  const range = max - min || 1;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const fillPoints = [`0,${height}`, ...points, `${width},${height}`].join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Current value dot */}
      {data.length > 0 && (
        <circle
          cx={width}
          cy={height - ((data[data.length - 1] - min) / range) * height}
          r="3"
          fill={color}
        />
      )}
    </svg>
  );
}

function MetricCard({ 
  title, icon, value, unit, subtitle, sparkData, sparkColor, status 
}: { 
  title: string;
  icon: React.ReactNode;
  value: string | number;
  unit?: string;
  subtitle?: string;
  sparkData?: number[];
  sparkColor?: string;
  status?: "good" | "warn" | "critical";
}) {
  const statusColor = status === "critical" ? "var(--error)" : status === "warn" ? "#f9e2af" : "var(--positive)";
  
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span style={{ color: sparkColor || "var(--accent)" }}>{icon}</span>
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            {title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: statusColor }} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {value}<span className="text-sm font-normal ml-1" style={{ color: "var(--text-muted)" }}>{unit}</span>
          </div>
          {subtitle && <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{subtitle}</div>}
        </div>
        {sparkData && sparkData.length > 1 && (
          <Sparkline data={sparkData} color={sparkColor || "#89b4fa"} height={36} width={120} />
        )}
      </div>
    </div>
  );
}

export default function SystemMonitor() {
  const { connected, system, systemHistory } = useEventStream();

  const cpuHistory = systemHistory.map((s) => s.cpu);
  const ramHistory = systemHistory.map((s) => s.ram.percent);
  const loadHistory = systemHistory.map((s) => s.loadAvg[0] * 10); // scale for sparkline

  const cpuStatus = (system?.cpu || 0) > 80 ? "critical" : (system?.cpu || 0) > 50 ? "warn" : "good";
  const ramStatus = (system?.ram.percent || 0) > 90 ? "critical" : (system?.ram.percent || 0) > 70 ? "warn" : "good";

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-2">
        {connected ? (
          <>
            <Wifi className="w-4 h-4" style={{ color: "var(--positive)" }} />
            <span className="text-xs" style={{ color: "var(--positive)" }}>Live Stream Connected</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              · Updates every 5s · {systemHistory.length} samples
            </span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" style={{ color: "var(--error)" }} />
            <span className="text-xs" style={{ color: "var(--error)" }}>Reconnecting...</span>
          </>
        )}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="CPU Usage"
          icon={<Cpu className="w-4 h-4" />}
          value={system?.cpu || 0}
          unit="%"
          subtitle={`Load: ${system?.loadAvg?.map((l) => l.toFixed(1)).join(" / ") || "..."}`}
          sparkData={cpuHistory}
          sparkColor="#89b4fa"
          status={cpuStatus}
        />
        <MetricCard
          title="Memory"
          icon={<HardDrive className="w-4 h-4" />}
          value={system?.ram.used?.toFixed(1) || 0}
          unit={`/ ${system?.ram.total?.toFixed(0) || 0} GB`}
          subtitle={`${system?.ram.percent || 0}% used`}
          sparkData={ramHistory}
          sparkColor="#cba6f7"
          status={ramStatus}
        />
        <MetricCard
          title="Uptime"
          icon={<Clock className="w-4 h-4" />}
          value={system?.uptime || "..."}
          subtitle="System uptime"
          sparkColor="#94e2d5"
          status="good"
        />
        <MetricCard
          title="Load Average"
          icon={<Activity className="w-4 h-4" />}
          value={system?.loadAvg?.[0]?.toFixed(2) || "..."}
          subtitle="1m / 5m / 15m"
          sparkData={loadHistory}
          sparkColor="#f9e2af"
          status={(system?.loadAvg?.[0] || 0) > 8 ? "critical" : (system?.loadAvg?.[0] || 0) > 4 ? "warn" : "good"}
        />
      </div>
    </div>
  );
}
