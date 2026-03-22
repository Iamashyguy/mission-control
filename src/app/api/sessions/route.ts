import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { OPENCLAW_DIR } from "@/lib/paths";

export const dynamic = "force-dynamic";

interface SessionInfo {
  id: string;
  agent: string;
  channel: string;
  type: string;
  lastActive: string;
  size: number;
}

export async function GET() {
  const sessions: SessionInfo[] = [];
  const sessionDir = path.join(OPENCLAW_DIR, "sessions");

  try {
    if (fs.existsSync(sessionDir)) {
      const files = fs.readdirSync(sessionDir);
      for (const f of files) {
        if (!f.endsWith(".db") && !f.endsWith(".sqlite") && !f.endsWith(".json")) continue;
        try {
          const fp = path.join(sessionDir, f);
          const stat = fs.statSync(fp);
          
          // Parse session key from filename: agent:agentId:channel:type:peerId
          const name = f.replace(/\.(db|sqlite|json)$/, "");
          const parts = name.split(":");
          
          sessions.push({
            id: name,
            agent: parts[1] || "unknown",
            channel: parts[2] || "unknown",
            type: parts[3] || "unknown",
            lastActive: stat.mtime.toISOString(),
            size: stat.size,
          });
        } catch {}
      }
    }
  } catch {}

  // Sort by most recent
  sessions.sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());

  return NextResponse.json({ sessions: sessions.slice(0, 50) });
}
