import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { WORKSPACE_MEMORY } from "@/lib/paths";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  if (!fs.existsSync(WORKSPACE_MEMORY)) {
    return NextResponse.json({ entries: [], total: 0 });
  }

  // List all daily memory files
  const files = fs.readdirSync(WORKSPACE_MEMORY)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort()
    .reverse();

  // If specific date requested, return that file's content
  if (date) {
    const filePath = path.join(WORKSPACE_MEMORY, `${date}.md`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const stats = fs.statSync(filePath);
      return NextResponse.json({
        date,
        content,
        size: `${(stats.size / 1024).toFixed(1)} KB`,
        lastModified: stats.mtime.toISOString(),
        sections: parseSections(content),
      });
    }
    return NextResponse.json({ error: "Journal entry not found" }, { status: 404 });
  }

  // Return list of all entries with previews
  const entries = files.map((f) => {
    const d = f.replace(".md", "");
    const filePath = path.join(WORKSPACE_MEMORY, f);
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const stats = fs.statSync(filePath);
      const lines = content.split("\n").filter((l) => l.trim());
      const sections = parseSections(content);

      // Extract preview (first meaningful content line)
      let preview = "";
      for (const line of lines) {
        if (line.startsWith("#")) continue;
        if (line.startsWith("---")) continue;
        preview = line.trim().slice(0, 150);
        break;
      }

      return {
        date: d,
        dayOfWeek: new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" }),
        size: `${(stats.size / 1024).toFixed(1)} KB`,
        lines: lines.length,
        sections: sections.length,
        sectionNames: sections.map((s) => s.title),
        preview,
        lastModified: stats.mtime.toISOString(),
      };
    } catch {
      return { date: d, dayOfWeek: "", size: "?", lines: 0, sections: 0, sectionNames: [], preview: "", lastModified: "" };
    }
  });

  // Calendar data (for heatmap) — count lines per day
  const calendarData = entries.map((e) => ({
    date: e.date,
    intensity: Math.min(e.lines / 50, 1), // normalize to 0-1
    lines: e.lines,
  }));

  return NextResponse.json({
    entries: entries.slice(0, 60), // last 60 entries
    total: entries.length,
    calendarData,
  });
}

function parseSections(content: string): Array<{ title: string; lineCount: number }> {
  const sections: Array<{ title: string; lineCount: number }> = [];
  const lines = content.split("\n");
  let currentSection = "";
  let lineCount = 0;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentSection) {
        sections.push({ title: currentSection, lineCount });
      }
      currentSection = line.replace("## ", "").trim();
      lineCount = 0;
    } else if (currentSection) {
      if (line.trim()) lineCount++;
    }
  }
  if (currentSection) sections.push({ title: currentSection, lineCount });

  return sections;
}
