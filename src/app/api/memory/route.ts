import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { OPENCLAW_WORKSPACE, WORKSPACE_MEMORY } from "@/lib/paths";

export const dynamic = "force-dynamic";

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  modified: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");
  const browse = searchParams.get("browse");

  // Read file content
  if (filePath) {
    const fullPath = path.join(OPENCLAW_WORKSPACE, filePath);
    // Security: prevent path traversal outside workspace
    if (!fullPath.startsWith(OPENCLAW_WORKSPACE)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    try {
      const content = fs.readFileSync(fullPath, "utf-8");
      const stat = fs.statSync(fullPath);
      return NextResponse.json({
        path: filePath,
        content: content.slice(0, 50000), // 50KB limit
        size: stat.size,
        modified: stat.mtime.toISOString(),
        truncated: stat.size > 50000,
      });
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  // Browse directory
  const browseDir = browse
    ? path.join(OPENCLAW_WORKSPACE, browse)
    : OPENCLAW_WORKSPACE;

  if (!browseDir.startsWith(OPENCLAW_WORKSPACE)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const entries: FileEntry[] = [];
  try {
    const items = fs.readdirSync(browseDir);
    for (const item of items) {
      if (item.startsWith(".") || item === "node_modules") continue;
      try {
        const itemPath = path.join(browseDir, item);
        const stat = fs.statSync(itemPath);
        const relPath = path.relative(OPENCLAW_WORKSPACE, itemPath);
        entries.push({
          name: item,
          path: relPath,
          type: stat.isDirectory() ? "dir" : "file",
          size: stat.size,
          modified: stat.mtime.toISOString(),
        });
      } catch {}
    }
  } catch {}

  // Sort: dirs first, then files alphabetically
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // Also list recent memory files separately
  const memoryFiles: FileEntry[] = [];
  try {
    if (fs.existsSync(WORKSPACE_MEMORY)) {
      const files = fs.readdirSync(WORKSPACE_MEMORY)
        .filter((f) => f.endsWith(".md"))
        .sort()
        .reverse()
        .slice(0, 10);
      for (const f of files) {
        const fp = path.join(WORKSPACE_MEMORY, f);
        const stat = fs.statSync(fp);
        memoryFiles.push({
          name: f,
          path: path.relative(OPENCLAW_WORKSPACE, fp),
          type: "file",
          size: stat.size,
          modified: stat.mtime.toISOString(),
        });
      }
    }
  } catch {}

  return NextResponse.json({
    browsePath: browse || "",
    entries,
    recentMemory: memoryFiles,
  });
}
