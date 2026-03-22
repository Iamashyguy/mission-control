import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { OPENCLAW_LOGS } from "@/lib/paths";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");
  const lines = parseInt(searchParams.get("lines") || "200");

  // List log files
  if (!file) {
    const logFiles: Array<{ name: string; size: number; modified: string }> = [];
    
    // Check multiple log locations
    const logDirs = [OPENCLAW_LOGS];
    for (const dir of logDirs) {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir).filter((f) => f.endsWith(".log") || f.endsWith(".txt"));
          for (const f of files) {
            const fp = path.join(dir, f);
            const stat = fs.statSync(fp);
            logFiles.push({
              name: f,
              size: stat.size,
              modified: stat.mtime.toISOString(),
            });
          }
        }
      } catch {}
    }

    // Also check for gateway log
    try {
      const gatewayLog = path.join(OPENCLAW_LOGS, "gateway.log");
      if (!logFiles.find((f) => f.name === "gateway.log") && fs.existsSync(gatewayLog)) {
        const stat = fs.statSync(gatewayLog);
        logFiles.push({ name: "gateway.log", size: stat.size, modified: stat.mtime.toISOString() });
      }
    } catch {}

    logFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    return NextResponse.json({ files: logFiles });
  }

  // Read specific log file (tail)
  const safeName = path.basename(file);
  const filePath = path.join(OPENCLAW_LOGS, safeName);
  
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const allLines = content.split("\n");
    const tailLines = allLines.slice(-lines);
    return NextResponse.json({
      file: safeName,
      content: tailLines.join("\n"),
      totalLines: allLines.length,
      showing: tailLines.length,
    });
  } catch {
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
