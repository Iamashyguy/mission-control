import { NextResponse } from "next/server";
import os from "os";
import { execSync } from "child_process";

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
    // macOS: use vm_stat + top for quick CPU snapshot
    const result = execSync("top -l 1 -n 0 | grep 'CPU usage'", { encoding: "utf-8", timeout: 5000 });
    const match = result.match(/(\d+\.\d+)% idle/);
    if (match) return Math.round(100 - parseFloat(match[1]));
  } catch {}
  return 0;
}

function getDiskUsage(): { used: number; total: number } {
  try {
    const result = execSync("df -g / | tail -1", { encoding: "utf-8", timeout: 3000 });
    const parts = result.trim().split(/\s+/);
    // df -g: filesystem, total, used, available, %used, mounted
    const total = parseInt(parts[1]) || 0;
    const used = parseInt(parts[2]) || 0;
    return { used, total };
  } catch {}
  return { used: 0, total: 0 };
}

function getLoadAvg(): number[] {
  return os.loadavg().map(l => Math.round(l * 100) / 100);
}

function getNetworkBytes(): { rx: number; tx: number } {
  try {
    const interfaces = os.networkInterfaces();
    // On macOS, use netstat for bytes
    const result = execSync("netstat -ib | grep -E '^en0' | head -1", { encoding: "utf-8", timeout: 3000 });
    const parts = result.trim().split(/\s+/);
    // Fields: Name, Mtu, Network, Address, Ipkts, Ierrs, Ibytes, Opkts, Oerrs, Obytes, Coll
    if (parts.length >= 10) {
      return { rx: parseInt(parts[6]) || 0, tx: parseInt(parts[9]) || 0 };
    }
  } catch {}
  return { rx: 0, tx: 0 };
}

function getServiceCount(): number {
  try {
    // Count PM2 processes
    const result = execSync("pm2 jlist 2>/dev/null", { encoding: "utf-8", timeout: 3000 });
    const procs = JSON.parse(result);
    return Array.isArray(procs) ? procs.filter((p: { pm2_env?: { status?: string } }) => p.pm2_env?.status === "online").length : 0;
  } catch {
    return 1; // At least mission-control itself
  }
}

export async function GET() {
  const totalMem = os.totalmem() / (1024 * 1024 * 1024);
  const freeMem = os.freemem() / (1024 * 1024 * 1024);
  const usedMem = totalMem - freeMem;
  const disk = getDiskUsage();

  return NextResponse.json({
    cpu: getCpuUsage(),
    ram: { used: Math.round(usedMem * 10) / 10, total: Math.round(totalMem) },
    disk,
    uptime: getUptime(),
    loadAvg: getLoadAvg(),
    network: getNetworkBytes(),
    services: getServiceCount(),
  });
}
