import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

// Allowlisted commands (safe, read-only)
const ALLOWED_COMMANDS: Record<string, string> = {
  "openclaw status": "openclaw status",
  "openclaw doctor": "openclaw doctor",
  "openclaw cron list": "openclaw cron list",
  "pm2 status": "pm2 status",
  "uptime": "uptime",
  "df -h": "df -h",
  "free -h": "vm_stat",
  "top summary": "top -l 1 -n 0 | head -12",
  "who": "who",
  "date": "date",
  "node version": "node --version",
  "npm version": "npm --version",
  "git status": "cd ~/.openclaw/workspace/mission-control && git status --short",
  "disk usage": "du -sh ~/.openclaw/ 2>/dev/null",
  "network interfaces": "ifconfig | grep -E '(^[a-z]|inet )' | head -20",
  "openclaw version": "openclaw --version 2>/dev/null || echo 'unknown'",
  "tail gateway log": "tail -30 ~/.openclaw/logs/gateway.log 2>/dev/null || echo 'No gateway log found'",
  "cron jobs": "crontab -l 2>/dev/null || echo 'No crontab'",
  "launchd agents": "ls ~/Library/LaunchAgents/ 2>/dev/null | grep -i openclaw || echo 'No OpenClaw launchd agents'",
  "processes": "ps aux | grep -E '(openclaw|node|next)' | grep -v grep | head -15",
};

export async function POST(request: Request) {
  try {
    const { command } = await request.json();

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "No command provided" }, { status: 400 });
    }

    const trimmed = command.trim().toLowerCase();

    // Check if command is allowlisted
    const actualCommand = ALLOWED_COMMANDS[trimmed];
    if (!actualCommand) {
      return NextResponse.json({
        error: `Command not allowed: "${command}"`,
        allowed: Object.keys(ALLOWED_COMMANDS),
      }, { status: 403 });
    }

    try {
      const output = execSync(actualCommand, {
        timeout: 15000,
        encoding: "utf-8",
        env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` },
      });

      return NextResponse.json({
        command: trimmed,
        output: output.trim(),
        timestamp: new Date().toISOString(),
        exitCode: 0,
      });
    } catch (execErr) {
      const err = execErr as { stdout?: string; stderr?: string; status?: number };
      return NextResponse.json({
        command: trimmed,
        output: err.stdout?.trim() || err.stderr?.trim() || "Command failed",
        timestamp: new Date().toISOString(),
        exitCode: err.status || 1,
      });
    }
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

// GET returns list of allowed commands
export async function GET() {
  return NextResponse.json({
    commands: Object.keys(ALLOWED_COMMANDS).map((cmd) => ({
      name: cmd,
      description: getDescription(cmd),
    })),
  });
}

function getDescription(cmd: string): string {
  const descriptions: Record<string, string> = {
    "openclaw status": "OpenClaw gateway & agent status",
    "openclaw doctor": "Run OpenClaw health checks",
    "openclaw cron list": "List all configured cron jobs",
    "pm2 status": "PM2 process manager status",
    "uptime": "System uptime",
    "df -h": "Disk space usage",
    "free -h": "Memory statistics",
    "top summary": "CPU/Memory summary",
    "who": "Logged in users",
    "date": "Current date and time",
    "node version": "Node.js version",
    "npm version": "npm version",
    "git status": "Mission Control git status",
    "disk usage": "OpenClaw directory size",
    "network interfaces": "Network interface info",
    "openclaw version": "OpenClaw version",
    "tail gateway log": "Last 30 lines of gateway log",
    "cron jobs": "System crontab entries",
    "launchd agents": "OpenClaw launchd agents",
    "processes": "Running OpenClaw/Node processes",
  };
  return descriptions[cmd] || cmd;
}
