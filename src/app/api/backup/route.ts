import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { OPENCLAW_DIR, OPENCLAW_WORKSPACE } from "@/lib/paths";

export const dynamic = "force-dynamic";

interface BackupInfo {
  name: string;
  type: "launchd" | "cron" | "manual";
  schedule: string;
  lastRun: string;
  status: "active" | "inactive" | "unknown";
  target: string;
  size: string;
}

export async function GET() {
  const backups: BackupInfo[] = [];

  // Check launchd backup agents
  const launchdDir = path.join(process.env.HOME || "", "Library/LaunchAgents");
  if (fs.existsSync(launchdDir)) {
    const agents = fs.readdirSync(launchdDir).filter((f) => f.includes("openclaw") || f.includes("backup"));
    for (const agent of agents) {
      try {
        const content = fs.readFileSync(path.join(launchdDir, agent), "utf-8");
        const labelMatch = content.match(/<key>Label<\/key>\s*<string>(.+?)<\/string>/);
        backups.push({
          name: labelMatch?.[1] || agent.replace(".plist", ""),
          type: "launchd",
          schedule: extractScheduleFromPlist(content),
          lastRun: "Check Console.app",
          status: "active",
          target: extractProgramFromPlist(content),
          size: "-",
        });
      } catch {}
    }
  }

  // Check cron-based backups
  try {
    const crontab = execSync("crontab -l 2>/dev/null || true", { encoding: "utf-8" });
    const lines = crontab.split("\n").filter((l) => l.trim() && !l.startsWith("#") && l.includes("backup"));
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      backups.push({
        name: `Cron: ${parts.slice(5).join(" ").slice(0, 50)}`,
        type: "cron",
        schedule: parts.slice(0, 5).join(" "),
        lastRun: "Check syslog",
        status: "active",
        target: parts.slice(5).join(" "),
        size: "-",
      });
    }
  } catch {}

  // Check OpenClaw cron backups
  try {
    const cronOutput = execSync("openclaw cron list 2>/dev/null || true", {
      encoding: "utf-8",
      env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin` },
    });
    const lines = cronOutput.split("\n").filter((l) => l.toLowerCase().includes("backup"));
    for (const line of lines) {
      backups.push({
        name: line.trim().split(/\s+/)[0] || "OpenClaw Backup",
        type: "cron",
        schedule: "See openclaw cron list",
        lastRun: "Via OpenClaw",
        status: "active",
        target: "OpenClaw managed",
        size: "-",
      });
    }
  } catch {}

  // Check workspace sizes
  const directories = [
    { name: "Workspace", path: OPENCLAW_WORKSPACE },
    { name: "OpenClaw Dir", path: OPENCLAW_DIR },
    { name: "Discover Workspace", path: path.join(OPENCLAW_DIR, "workspace-discover") },
    { name: "Logs", path: path.join(OPENCLAW_DIR, "logs") },
    { name: "Memory Files", path: path.join(OPENCLAW_WORKSPACE, "memory") },
  ];

  const storageSummary: Array<{ name: string; path: string; size: string }> = [];
  for (const dir of directories) {
    if (fs.existsSync(dir.path)) {
      try {
        const size = execSync(`du -sh "${dir.path}" 2>/dev/null | cut -f1`, { encoding: "utf-8" }).trim();
        storageSummary.push({ name: dir.name, path: dir.path.replace(/.*\.openclaw/, "~/.openclaw"), size });
      } catch {
        storageSummary.push({ name: dir.name, path: dir.path.replace(/.*\.openclaw/, "~/.openclaw"), size: "?" });
      }
    }
  }

  // Backup recommendations
  const recommendations = [];
  if (backups.length === 0) {
    recommendations.push({ level: "warning", message: "No automated backups detected. Consider setting up Time Machine or a cron backup." });
  }
  
  // Check if iCloud is available
  const icloudPath = path.join(process.env.HOME || "", "Library/Mobile Documents/com~apple~CloudDocs");
  if (fs.existsSync(icloudPath)) {
    recommendations.push({ level: "info", message: "iCloud Drive available — consider syncing workspace to iCloud." });
  }

  return NextResponse.json({
    backups,
    storageSummary,
    recommendations,
    totalBackups: backups.length,
  });
}

function extractScheduleFromPlist(content: string): string {
  const intervalMatch = content.match(/<key>StartInterval<\/key>\s*<integer>(\d+)<\/integer>/);
  if (intervalMatch) {
    const seconds = parseInt(intervalMatch[1]);
    if (seconds < 3600) return `Every ${Math.round(seconds / 60)} min`;
    if (seconds < 86400) return `Every ${Math.round(seconds / 3600)} hr`;
    return `Every ${Math.round(seconds / 86400)} day`;
  }

  const calendarMatch = content.match(/<key>StartCalendarInterval<\/key>/);
  if (calendarMatch) return "Calendar-based (see plist)";

  return "Unknown schedule";
}

function extractProgramFromPlist(content: string): string {
  const progMatch = content.match(/<key>Program<\/key>\s*<string>(.+?)<\/string>/);
  if (progMatch) return progMatch[1];

  const argsMatch = content.match(/<key>ProgramArguments<\/key>\s*<array>([\s\S]*?)<\/array>/);
  if (argsMatch) {
    const strings = argsMatch[1].match(/<string>(.+?)<\/string>/g);
    if (strings) return strings.map((s) => s.replace(/<\/?string>/g, "")).join(" ").slice(0, 100);
  }

  return "Unknown";
}
