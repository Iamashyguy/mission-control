import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { WORKSPACE_MEMORY } from "@/lib/paths";

export const dynamic = "force-dynamic";

interface ActivityEntry {
  id: string;
  timestamp: string;
  type: "decision" | "event" | "learning" | "error" | "cron";
  content: string;
  source: string;
}

export async function GET() {
  const activities: ActivityEntry[] = [];

  try {
    // Read today's memory file and recent ones
    const memDir = WORKSPACE_MEMORY;
    if (fs.existsSync(memDir)) {
      const files = fs.readdirSync(memDir)
        .filter((f) => f.match(/^\d{4}-\d{2}-\d{2}\.md$/))
        .sort()
        .reverse()
        .slice(0, 3); // last 3 days

      for (const file of files) {
        const content = fs.readFileSync(path.join(memDir, file), "utf-8");
        const date = file.replace(".md", "");
        
        // Parse sections
        const lines = content.split("\n");
        let currentSection = "";
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith("## ")) {
            currentSection = line.replace("## ", "").toLowerCase();
          } else if (line.startsWith("- ") && line.length > 4) {
            const cleanContent = line.replace(/^- \[?\d{1,2}:\d{2}[^\]]*\]?\s*/, "").replace(/^- /, "");
            if (cleanContent.length < 5) continue;
            
            let type: ActivityEntry["type"] = "event";
            if (currentSection.includes("decision")) type = "decision";
            else if (currentSection.includes("learning")) type = "learning";
            else if (currentSection.includes("error")) type = "error";
            
            activities.push({
              id: `${date}-${i}`,
              timestamp: date,
              type,
              content: cleanContent,
              source: file,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to read activity:", err);
  }

  return NextResponse.json({ activities: activities.slice(0, 50) });
}
