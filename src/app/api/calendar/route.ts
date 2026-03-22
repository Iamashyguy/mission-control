import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: "cron" | "compliance" | "content" | "system" | "personal";
  color: string;
  recurring: boolean;
  source: string;
  details?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM format
  const events: CalendarEvent[] = [];

  const now = new Date();
  const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, mon] = targetMonth.split("-").map(Number);

  // 1. Cron jobs — parse schedules into events
  try {
    const cronOutput = execSync("openclaw cron list 2>/dev/null || true", {
      encoding: "utf-8",
      env: { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin` },
    });
    const lines = cronOutput.split("\n").filter((l) => l.trim() && !l.startsWith("─") && !l.startsWith("Name"));
    for (const line of lines) {
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length >= 2) {
        const name = parts[0]?.trim();
        const schedule = parts[1]?.trim() || "";
        if (name && schedule) {
          // Generate recurring events for the month
          const cronEvents = generateCronEvents(name, schedule, year, mon);
          events.push(...cronEvents);
        }
      }
    }
  } catch {}

  // 2. Compliance deadlines
  const complianceFilings = [
    { name: "GST Return (GSTR-3B)", day: 20, monthly: true, company: "India Prop", flag: "🇮🇳" },
    { name: "GST Return (GSTR-1)", day: 11, monthly: true, company: "India Prop", flag: "🇮🇳" },
    { name: "Income Tax Return", dueDate: `${year}-07-31`, company: "India Prop", flag: "🇮🇳" },
    { name: "UK Annual Accounts", dueDate: `${year}-09-30`, company: "UK Ltd", flag: "🇬🇧" },
    { name: "UK Confirmation Statement", dueDate: `${year}-06-30`, company: "UK Ltd", flag: "🇬🇧" },
    { name: "US Federal Tax Return", dueDate: `${year}-04-15`, company: "US LLC", flag: "🇺🇸" },
    { name: "US Annual Report", dueDate: `${year}-04-15`, company: "US LLC", flag: "🇺🇸" },
    { name: "US State Franchise Tax", dueDate: `${year}-05-15`, company: "US LLC", flag: "🇺🇸" },
    { name: "FBAR Filing", dueDate: `${year}-04-15`, company: "US LLC", flag: "🇺🇸" },
  ];

  for (const filing of complianceFilings) {
    if (filing.monthly) {
      const dateStr = `${year}-${String(mon).padStart(2, "0")}-${String(filing.day).padStart(2, "0")}`;
      events.push({
        id: `compliance-${filing.name}-${dateStr}`,
        title: `${filing.flag} ${filing.name}`,
        date: dateStr,
        category: "compliance",
        color: "#FF453A",
        recurring: true,
        source: filing.company,
        details: `${filing.company} — Due ${filing.day}th every month`,
      });
    } else if (filing.dueDate) {
      const [, m] = filing.dueDate.split("-").map(Number);
      if (m === mon) {
        events.push({
          id: `compliance-${filing.name}-${filing.dueDate}`,
          title: `${filing.flag} ${filing.name}`,
          date: filing.dueDate,
          category: "compliance",
          color: "#FF453A",
          recurring: false,
          source: filing.company,
          details: `${filing.company} — Annual filing`,
        });
      }
    }
  }

  // 3. System events (known fixed dates)
  const systemEvents = [
    { name: "Claude Max Billing", day: 1, details: "$200/mo subscription renewal" },
    { name: "MiniMax Plus Billing", day: 1, details: "$20/mo subscription renewal" },
  ];
  for (const ev of systemEvents) {
    const dateStr = `${year}-${String(mon).padStart(2, "0")}-${String(ev.day).padStart(2, "0")}`;
    events.push({
      id: `system-${ev.name}-${dateStr}`,
      title: `💳 ${ev.name}`,
      date: dateStr,
      category: "system",
      color: "#FFD60A",
      recurring: true,
      source: "System",
      details: ev.details,
    });
  }

  // Sort by date
  events.sort((a, b) => a.date.localeCompare(b.date));

  // Category summary
  const categories = {
    cron: events.filter((e) => e.category === "cron").length,
    compliance: events.filter((e) => e.category === "compliance").length,
    system: events.filter((e) => e.category === "system").length,
    content: events.filter((e) => e.category === "content").length,
  };

  return NextResponse.json({
    month: targetMonth,
    events,
    totalEvents: events.length,
    categories,
    daysInMonth: new Date(year, mon, 0).getDate(),
  });
}

function generateCronEvents(name: string, schedule: string, year: number, month: number): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // Simple cron parsing for common patterns
  // Format: "daily 6:30 AM" or "0 1 * * *" etc.
  const dailyMatch = schedule.match(/daily|every\s*day|0\s+\d+\s+\*\s+\*\s+\*/i);
  const weeklyMatch = schedule.match(/weekly|every\s*(mon|tue|wed|thu|fri|sat|sun)/i);
  const hourlyMatch = schedule.match(/hourly|every\s*(\d+)\s*h/i);

  // Extract time if available
  const timeMatch = schedule.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3] || ""}`.trim() : undefined;

  const daysInMonth = new Date(year, month, 0).getDate();

  if (dailyMatch || schedule.includes("* * *")) {
    // Daily — just add first, 8th, 15th, 22nd to avoid clutter
    for (const day of [1, 8, 15, 22]) {
      if (day <= daysInMonth) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        events.push({
          id: `cron-${name}-${dateStr}`,
          title: `⏰ ${name}`,
          date: dateStr,
          time,
          category: "cron",
          color: "#3B82F6",
          recurring: true,
          source: "OpenClaw Cron",
          details: `Schedule: ${schedule} (daily — showing weekly markers)`,
        });
      }
    }
  } else if (weeklyMatch) {
    // Weekly — add 4 events
    for (let week = 0; week < 4; week++) {
      const day = 1 + week * 7;
      if (day <= daysInMonth) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        events.push({
          id: `cron-${name}-${dateStr}`,
          title: `⏰ ${name}`,
          date: dateStr,
          time,
          category: "cron",
          color: "#3B82F6",
          recurring: true,
          source: "OpenClaw Cron",
          details: `Schedule: ${schedule}`,
        });
      }
    }
  } else {
    // Unknown schedule — add on 1st of month as placeholder
    const dateStr = `${year}-${String(month).padStart(2, "0")}-01`;
    events.push({
      id: `cron-${name}-${dateStr}`,
      title: `⏰ ${name}`,
      date: dateStr,
      time,
      category: "cron",
      color: "#3B82F6",
      recurring: true,
      source: "OpenClaw Cron",
      details: `Schedule: ${schedule}`,
    });
  }

  return events;
}
