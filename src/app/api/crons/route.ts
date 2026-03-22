import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  nextRun: string;
  lastRun: string;
  status: string;
  target: string;
  agentId: string;
  model: string;
}

function parseFixedWidthTable(output: string): CronJob[] {
  const lines = output.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0];
  // Find column positions from header
  const cols = ["ID", "Name", "Schedule", "Next", "Last", "Status", "Target", "Agent ID", "Model"];
  const positions: number[] = [];
  for (const col of cols) {
    const idx = header.indexOf(col);
    if (idx >= 0) positions.push(idx);
  }
  if (positions.length < 6) return [];

  const crons: CronJob[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const getValue = (colIdx: number): string => {
      const start = positions[colIdx];
      const end = colIdx + 1 < positions.length ? positions[colIdx + 1] : line.length;
      return line.slice(start, end).trim();
    };

    crons.push({
      id: getValue(0),
      name: getValue(1),
      schedule: getValue(2),
      nextRun: getValue(3),
      lastRun: getValue(4),
      status: getValue(5),
      target: getValue(6),
      agentId: positions.length > 7 ? getValue(7) : "-",
      model: positions.length > 8 ? getValue(8) : "",
    });
  }

  return crons;
}

export async function GET() {
  let crons: CronJob[] = [];

  try {
    const output = execSync("openclaw cron list 2>/dev/null", {
      encoding: "utf-8",
      timeout: 10000,
    });

    // Try JSON parse first
    try {
      const parsed = JSON.parse(output);
      crons = parsed;
    } catch {
      // Parse fixed-width table
      crons = parseFixedWidthTable(output);
    }
  } catch (err) {
    console.error("Failed to list crons:", err);
  }

  // System crontab
  const systemCrons: CronJob[] = [];
  try {
    const crontab = execSync("crontab -l 2>/dev/null", { encoding: "utf-8", timeout: 5000 });
    const lines = crontab.trim().split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const schedule = parts.slice(0, 5).join(" ");
      const command = parts.slice(5).join(" ");
      const shortCmd = command.length > 60 ? command.slice(0, 57) + "..." : command;
      systemCrons.push({
        id: `sys-${Buffer.from(command).toString("base64").slice(0, 12)}`,
        name: shortCmd,
        schedule,
        nextRun: "",
        lastRun: "",
        status: "active",
        target: "system",
        agentId: "-",
        model: "crontab",
      });
    }
  } catch {}

  return NextResponse.json({ crons, systemCrons });
}
