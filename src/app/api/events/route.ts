import { NextRequest } from "next/server";
import os from "os";
import fs from "fs";
import { execSync } from "child_process";
import { OPENCLAW_CONFIG, DISCOVER_STATUS } from "@/lib/paths";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SystemSnapshot {
  cpu: number;
  ram: { used: number; total: number; percent: number };
  uptime: string;
  loadAvg: number[];
  timestamp: number;
}

function getSystemSnapshot(): SystemSnapshot {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const percent = Math.round((usedMem / totalMem) * 100);

  let cpu = 0;
  try {
    const result = execSync("top -l 1 -n 0 2>/dev/null | grep 'CPU usage'", { encoding: "utf-8", timeout: 5000 });
    const match = result.match(/(\d+\.\d+)% idle/);
    if (match) cpu = Math.round(100 - parseFloat(match[1]));
  } catch {}

  const secs = os.uptime();
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  const uptime = days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;

  return {
    cpu,
    ram: {
      used: Math.round(usedMem / (1024 * 1024 * 1024) * 10) / 10,
      total: Math.round(totalMem / (1024 * 1024 * 1024) * 10) / 10,
      percent,
    },
    uptime,
    loadAvg: os.loadavg().map((l) => Math.round(l * 100) / 100),
    timestamp: Date.now(),
  };
}

function getAgentCount(): number {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, "utf-8"));
    return config?.agents?.list?.length || 0;
  } catch {}
  return 0;
}

function getDiscoverStatus(): { sites: number; errors: number } {
  try {
    if (fs.existsSync(DISCOVER_STATUS)) {
      const status = JSON.parse(fs.readFileSync(DISCOVER_STATUS, "utf-8"));
      return {
        sites: status?.sites?.length || status?.total_sites || 0,
        errors: status?.errors?.critical_count || 0,
      };
    }
  } catch {}
  return { sites: 0, errors: 0 };
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`));

      // System stats every 5 seconds
      const systemInterval = setInterval(() => {
        if (closed) return;
        try {
          const snapshot = getSystemSnapshot();
          controller.enqueue(encoder.encode(`event: system\ndata: ${JSON.stringify(snapshot)}\n\n`));
        } catch {}
      }, 5000);

      // Agent/discover status every 30 seconds
      const statusInterval = setInterval(() => {
        if (closed) return;
        try {
          const agents = getAgentCount();
          const discover = getDiscoverStatus();
          controller.enqueue(
            encoder.encode(
              `event: status\ndata: ${JSON.stringify({ agents, discover, timestamp: Date.now() })}\n\n`
            )
          );
        } catch {}
      }, 30000);

      // Heartbeat every 15 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {}
      }, 15000);

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(systemInterval);
        clearInterval(statusInterval);
        clearInterval(heartbeatInterval);
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
