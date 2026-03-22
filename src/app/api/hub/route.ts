import { NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import { execSync } from "child_process";
import { OPENCLAW_CONFIG, DISCOVER_STATUS } from "@/lib/paths";

export const dynamic = "force-dynamic";

function getUptime(): string {
  const secs = os.uptime();
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  return days > 0 ? `${days}d ${hours}h ${mins}m` : `${hours}h ${mins}m`;
}

function getCpuUsage(): number {
  try {
    const result = execSync("top -l 1 -n 0 | grep 'CPU usage'", { encoding: "utf-8", timeout: 5000 });
    const match = result.match(/(\d+\.\d+)% idle/);
    if (match) return Math.round(100 - parseFloat(match[1]));
  } catch {}
  return 0;
}

async function getSessionStats(): Promise<{ active: number; total: number; totalTokens: number; models: number }> {
  try {
    // Use internal API instead of CLI (CLI times out)
    const res = await fetch("http://localhost:3333/api/sessions", { headers: { Cookie: `mc_auth=${process.env.AUTH_SECRET}` } });
    if (res.ok) {
      const data = await res.json();
      const sessions = data.sessions || [];
      const now = Date.now();
      const active = sessions.filter((s: { updatedAt?: number }) => s.updatedAt && now - s.updatedAt < 3600000).length;
      const totalTokens = sessions.reduce((a: number, s: { totalTokens?: number }) => a + (s.totalTokens || 0), 0);
      const models = new Set(sessions.map((s: { model?: string }) => s.model).filter(Boolean)).size;
      return { active, total: sessions.length, totalTokens, models };
    }
  } catch {}
  return { active: 0, total: 0, totalTokens: 0, models: 0 };
}

async function getCronStats(): Promise<{ total: number; active: number; nextRun: string | null }> {
  try {
    const res = await fetch("http://localhost:3333/api/crons", { headers: { Cookie: `mc_auth=${process.env.AUTH_SECRET}` } });
    if (res.ok) {
      const data = await res.json();
      const crons = Array.isArray(data) ? data : (data.crons || []);
      const active = crons.filter((c: { status?: string }) => c.status === "active").length;
      const nextRuns = crons
        .map((c: { nextRun?: string }) => c.nextRun)
        .filter(Boolean)
        .sort();
      return { total: crons.length, active, nextRun: nextRuns[0] || null };
    }
  } catch {}
  return { total: 0, active: 0, nextRun: null };
}

export async function GET() {
  // Agent count
  let agentCount = 0;
  let agentNames: string[] = [];
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, "utf-8"));
    const agents = config?.agents?.list || [];
    agentCount = agents.length;
    agentNames = agents.map((a: { id?: string; name?: string }) => a.name || a.id || "unknown");
  } catch {}

  // Discover errors
  let discoverErrors = 0;
  let discoverSites = 0;
  try {
    if (fs.existsSync(DISCOVER_STATUS)) {
      const status = JSON.parse(fs.readFileSync(DISCOVER_STATUS, "utf-8"));
      discoverErrors = status?.errors?.critical_count || 0;
      discoverSites = status?.sites?.length || status?.total_sites || 0;
    }
  } catch {}

  // System stats
  const totalMem = os.totalmem() / (1024 * 1024 * 1024);
  const freeMem = os.freemem() / (1024 * 1024 * 1024);
  const ramPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

  // Session stats (real data) - use internal APIs
  const sessionStats = await getSessionStats();
  
  // Cron stats (real data) - use internal APIs  
  const cronStats = await getCronStats();

  // Recent memory files for activity
  const workspaceDir = process.env.OPENCLAW_DIR
    ? `${process.env.OPENCLAW_DIR}/workspace`
    : `${process.env.HOME}/.openclaw/workspace`;
  const memoryDir = `${workspaceDir}/memory`;
  
  const recentActivity: Array<{ id: string; agent: string; action: string; time: string; status: string }> = [];
  try {
    const files = fs.readdirSync(memoryDir)
      .filter((f: string) => f.endsWith(".md"))
      .sort()
      .reverse()
      .slice(0, 5);
    files.forEach((f: string, i: number) => {
      const stat = fs.statSync(`${memoryDir}/${f}`);
      recentActivity.push({
        id: `mem-${i}`,
        agent: "Dev",
        action: `Memory updated: ${f}`,
        time: stat.mtime.toISOString(),
        status: "success",
      });
    });
  } catch {}

  return NextResponse.json({
    agents: {
      total: agentCount,
      active: agentCount,
      names: agentNames,
    },
    costs: {
      today: 0,
      month: 220,
      projected: 220,
      savings: 980,
    },
    sessions: {
      active: sessionStats.active,
      total: sessionStats.total,
      totalTokens: sessionStats.totalTokens,
      models: sessionStats.models,
    },
    crons: {
      total: cronStats.total,
      active: cronStats.active,
      nextRun: cronStats.nextRun,
    },
    errors: {
      today: discoverErrors,
      unresolved: discoverErrors,
    },
    discover: {
      sites: discoverSites,
    },
    system: {
      cpu: getCpuUsage(),
      ram: ramPercent,
      uptime: getUptime(),
    },
    recentActivity,
  });
}
