import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { OPENCLAW_WORKSPACE, OPENCLAW_LOGS } from "@/lib/paths";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const notifications: Notification[] = [];
  const now = new Date();

  // 1. Check for recent errors in memory/errors.md
  const errorsPath = path.join(OPENCLAW_WORKSPACE, "memory", "errors.md");
  if (fs.existsSync(errorsPath)) {
    try {
      const content = fs.readFileSync(errorsPath, "utf-8");
      const lines = content.split("\n").filter((l) => l.startsWith("- ") || l.startsWith("| "));
      const recentErrors = lines.slice(-5);
      for (let i = 0; i < recentErrors.length; i++) {
        const line = recentErrors[i];
        if (line.includes("CRITICAL") || line.includes("ERROR")) {
          notifications.push({
            id: `error-${i}`,
            title: "Error Detected",
            message: line.replace(/^[-|]\s*/, "").slice(0, 150),
            level: line.includes("CRITICAL") ? "critical" : "high",
            source: "Error Tracker",
            timestamp: now.toISOString(),
            read: false,
            link: "/logs",
          });
        }
      }
    } catch {}
  }

  // 2. Check gateway log for recent errors
  const gatewayLog = path.join(OPENCLAW_LOGS, "gateway.log");
  if (fs.existsSync(gatewayLog)) {
    try {
      const stat = fs.statSync(gatewayLog);
      const logSize = stat.size;
      // Read last 10KB
      const fd = fs.openSync(gatewayLog, "r");
      const buf = Buffer.alloc(Math.min(10240, logSize));
      fs.readSync(fd, buf, 0, buf.length, Math.max(0, logSize - buf.length));
      fs.closeSync(fd);
      const recent = buf.toString("utf-8");
      const errorLines = recent.split("\n").filter((l) =>
        l.includes("[ERROR]") || l.includes("[WARN]")
      ).slice(-3);
      for (let i = 0; i < errorLines.length; i++) {
        const line = errorLines[i];
        const isError = line.includes("[ERROR]");
        notifications.push({
          id: `gateway-${i}`,
          title: isError ? "Gateway Error" : "Gateway Warning",
          message: line.replace(/.*\]\s*/, "").slice(0, 150),
          level: isError ? "high" : "low",
          source: "Gateway",
          timestamp: extractTimestamp(line) || now.toISOString(),
          read: false,
          link: "/logs",
        });
      }
    } catch {}
  }

  // 3. Check system health thresholds
  const os = await import("os");
  const cpuLoad = os.loadavg()[0] / os.cpus().length;
  if (cpuLoad > 0.8) {
    notifications.push({
      id: "cpu-high",
      title: "High CPU Usage",
      message: `CPU load average is ${(cpuLoad * 100).toFixed(0)}% — above 80% threshold`,
      level: cpuLoad > 0.95 ? "critical" : "high",
      source: "System Monitor",
      timestamp: now.toISOString(),
      read: false,
      link: "/agents",
    });
  }

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = (totalMem - freeMem) / totalMem;
  if (memUsage > 0.85) {
    notifications.push({
      id: "mem-high",
      title: "High Memory Usage",
      message: `Memory usage is ${(memUsage * 100).toFixed(0)}% — above 85% threshold`,
      level: memUsage > 0.95 ? "critical" : "high",
      source: "System Monitor",
      timestamp: now.toISOString(),
      read: false,
      link: "/agents",
    });
  }

  // 4. Check if daily memory file exists for today
  const todayFile = path.join(OPENCLAW_WORKSPACE, "memory", `${now.toISOString().split("T")[0]}.md`);
  if (!fs.existsSync(todayFile)) {
    notifications.push({
      id: "no-daily-memory",
      title: "No Daily Memory File",
      message: `Today's memory file hasn't been created yet (${now.toISOString().split("T")[0]}.md)`,
      level: "info",
      source: "Memory System",
      timestamp: now.toISOString(),
      read: false,
      link: "/journal",
    });
  }

  // 5. Add info notifications
  notifications.push({
    id: "phase2-complete",
    title: "Phase 2 Complete!",
    message: "All 8 Phase 2 business panels are live. Phase 3 implementation in progress.",
    level: "info",
    source: "Mission Control",
    timestamp: now.toISOString(),
    read: true,
    link: "/hub",
  });

  // Sort: unread first, then by level priority, then by time
  const levelOrder = { critical: 0, high: 1, low: 2, info: 3 };
  notifications.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    if (a.level !== b.level) return levelOrder[a.level] - levelOrder[b.level];
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return NextResponse.json({
    notifications,
    summary: {
      total: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      critical: notifications.filter((n) => n.level === "critical").length,
      high: notifications.filter((n) => n.level === "high").length,
      low: notifications.filter((n) => n.level === "low").length,
      info: notifications.filter((n) => n.level === "info").length,
    },
  });
}

function extractTimestamp(line: string): string | null {
  const match = line.match(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/);
  return match ? new Date(match[0]).toISOString() : null;
}

// In-memory read state (persists across requests within same server instance)
const readState = new Map<string, boolean>();

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    
    if (body.action === "markAllRead") {
      // Mark all as read
      readState.clear();
      // Set a global flag
      readState.set("__all_read__", true);
      return NextResponse.json({ success: true });
    }
    
    if (body.id && body.read !== undefined) {
      readState.set(body.id, body.read);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      readState.set(`__deleted_${id}__`, true);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 });
  }
}
