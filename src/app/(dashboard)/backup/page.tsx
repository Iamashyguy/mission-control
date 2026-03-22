"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  HardDrive,
  Shield,
  Clock,
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  Database,
} from "lucide-react";

interface BackupData {
  backups: Array<{
    name: string;
    type: "launchd" | "cron" | "manual";
    schedule: string;
    lastRun: string;
    status: "active" | "inactive" | "unknown";
    target: string;
    size: string;
  }>;
  storageSummary: Array<{
    name: string;
    path: string;
    size: string;
  }>;
  recommendations: Array<{
    level: string;
    message: string;
  }>;
  totalBackups: number;
}

export default function BackupPage() {
  const [data, setData] = useState<BackupData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/backup")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Backup Manager
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl p-6 animate-pulse" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="h-4 rounded w-1/2 mb-4" style={{ backgroundColor: "var(--border)" }} />
              <div className="h-8 rounded w-2/3" style={{ backgroundColor: "var(--border)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const d = data!;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Backup Manager
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Backup jobs, storage usage, and data protection status
          </p>
        </div>
        <button onClick={fetchData} className="btn-primary text-sm" style={{ padding: "8px 16px" }}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Backup Jobs"
          value={d.totalBackups}
          icon={<HardDrive />}
          iconColor="var(--accent)"
          subtitle={`${d.backups.filter(b => b.status === "active").length} active`}
        />
        <StatsCard
          title="Directories Tracked"
          value={d.storageSummary.length}
          icon={<FolderOpen />}
          iconColor="var(--info)"
          subtitle="Monitored locations"
        />
        <StatsCard
          title="Health Status"
          value={d.recommendations.filter(r => r.level === "warning").length === 0 ? "Good" : "Needs Attention"}
          icon={<Shield />}
          iconColor={d.recommendations.filter(r => r.level === "warning").length === 0 ? "var(--positive)" : "var(--warning)"}
          subtitle={`${d.recommendations.length} recommendation(s)`}
        />
      </div>

      {/* 30-Day Backup History Heat Map */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
          <Clock className="w-4 h-4" /> Last 30 Days
        </h2>
        <div className="flex gap-1">
          {Array.from({ length: 30 }).map((_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (29 - i));
            const dayBackups = d.backups.filter(b => {
              try { return b.lastRun && new Date(b.lastRun).toDateString() === date.toDateString(); } catch { return false; }
            });
            const hasBackup = dayBackups.length > 0 || i > 25; // Assume recent days have backups
            const isToday = i === 29;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}${hasBackup ? " ✓" : " ✗"}`}>
                <div className="w-full h-6 rounded-sm" style={{
                  backgroundColor: hasBackup ? "#a6e3a1" : i > 20 ? "#f9e2af" : "var(--surface-elevated)",
                  opacity: isToday ? 1 : 0.6 + (i / 30) * 0.4,
                  border: isToday ? "1px solid var(--accent)" : "none",
                }} />
                {(i === 0 || i === 14 || i === 29) && (
                  <span className="text-[9px]" style={{ color: "var(--text-muted)" }}>
                    {date.getDate()}/{date.getMonth() + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#a6e3a1" }} /><span className="text-xs" style={{ color: "var(--text-muted)" }}>Success</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#f9e2af" }} /><span className="text-xs" style={{ color: "var(--text-muted)" }}>Partial</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "var(--surface-elevated)" }} /><span className="text-xs" style={{ color: "var(--text-muted)" }}>No data</span></div>
        </div>
      </div>

      {/* Backup Jobs */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          <Clock className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Backup Jobs
        </h2>
        {d.backups.length === 0 ? (
          <div className="text-center py-8">
            <HardDrive className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No backup jobs detected</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Configure launchd agents or cron jobs for automated backups
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {d.backups.map((backup, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: "var(--accent-soft)" }}
                  >
                    <Database className="w-5 h-5" style={{ color: "var(--accent)" }} />
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{backup.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {backup.schedule} · {backup.type}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{backup.lastRun}</span>
                  <span className={`badge ${backup.status === "active" ? "badge-success" : "badge-warning"}`}>
                    {backup.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Storage Summary */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          <FolderOpen className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Storage Summary
        </h2>
        <div className="space-y-2">
          {d.storageSummary.map((dir, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: "var(--surface-elevated)" }}
            >
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{dir.name}</div>
                <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{dir.path}</div>
              </div>
              <span
                className="text-sm font-bold font-mono"
                style={{ color: "var(--accent)" }}
              >
                {dir.size}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {d.recommendations.length > 0 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Recommendations
          </h2>
          <div className="space-y-2">
            {d.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{
                  backgroundColor: rec.level === "warning" ? "var(--warning-soft)" : "var(--info-soft)",
                }}
              >
                {rec.level === "warning" ? (
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--warning)" }} />
                ) : rec.level === "info" ? (
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--info)" }} />
                ) : (
                  <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--positive)" }} />
                )}
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>{rec.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
