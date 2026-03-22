import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { OPENCLAW_WORKSPACE } from "@/lib/paths";

export const dynamic = "force-dynamic";

interface FileEntry {
  name: string;
  type: "file" | "folder";
  size: number;
  modified: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspace = searchParams.get("workspace") || OPENCLAW_WORKSPACE;
  const browsePath = searchParams.get("path") || "";
  const wantContent = searchParams.get("content") === "true";
  const wantRaw = searchParams.get("raw") === "true";

  // Resolve full path
  const fullPath = path.resolve(workspace, browsePath);

  // Security: must be within workspace
  if (!fullPath.startsWith(path.resolve(workspace))) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const stat = fs.statSync(fullPath);

    // Return file content
    if (stat.isFile()) {
      if (wantRaw) {
        // Return raw binary (for images)
        const buffer = fs.readFileSync(fullPath);
        const ext = path.extname(fullPath).toLowerCase();
        const mimeMap: Record<string, string> = {
          ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
          ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
          ".ico": "image/x-icon", ".pdf": "application/pdf",
        };
        return new NextResponse(buffer, {
          headers: { "Content-Type": mimeMap[ext] || "application/octet-stream" },
        });
      }

      if (wantContent) {
        const content = fs.readFileSync(fullPath, "utf-8");
        return NextResponse.json({
          content: content.slice(0, 100000), // 100KB limit
          size: stat.size,
          modified: stat.mtime.toISOString(),
          truncated: stat.size > 100000,
        });
      }
    }

    // Browse directory
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(fullPath);
      const items: FileEntry[] = [];

      for (const name of entries) {
        if (name.startsWith(".") || name === "node_modules" || name === ".next") continue;
        try {
          const itemPath = path.join(fullPath, name);
          const itemStat = fs.statSync(itemPath);
          items.push({
            name,
            type: itemStat.isDirectory() ? "folder" : "file",
            size: itemStat.size,
            modified: itemStat.mtime.toISOString(),
          });
        } catch {
          // Skip unreadable items
        }
      }

      // Sort: folders first, then alphabetically
      items.sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return NextResponse.json({ items, path: browsePath });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Path not found" }, { status: 404 });
  }
}
