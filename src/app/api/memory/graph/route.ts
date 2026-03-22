import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const WORKSPACE = process.env.OPENCLAW_DIR
  ? path.join(process.env.OPENCLAW_DIR, "workspace")
  : path.join(process.env.HOME || "/tmp", ".openclaw", "workspace");

interface FileNode {
  id: string;
  name: string;
  path: string;
  size: number;
  type: "md" | "json" | "other";
  links: string[];
}

interface GraphData {
  nodes: { id: string; label: string; size: number; color: string; type: string }[];
  edges: { id: string; source: string; target: string }[];
  stats: { totalFiles: number; totalLinks: number; totalSize: number };
}

const WIKI_LINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const MD_LINK_RE = /\[(?:[^\]]*)\]\(([^)]+\.md)\)/g;

function getColor(filePath: string): string {
  if (filePath.includes("memory/")) return "#94e2d5";
  if (filePath.includes("life/")) return "#89b4fa";
  if (filePath.includes("plans/")) return "#f9e2af";
  if (filePath.includes("skills/")) return "#cba6f7";
  if (filePath === "MEMORY.md") return "#f38ba8";
  if (filePath === "context.md") return "#fab387";
  if (filePath === "decisions.md") return "#a6e3a1";
  if (filePath === "SOUL.md") return "#eba0ac";
  if (filePath.endsWith(".md")) return "#b4befe";
  return "#89dceb";
}

function scanDir(dir: string, baseDir: string, files: FileNode[], depth = 0): void {
  if (depth > 3) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name.startsWith("_ref") || entry.name === "node_modules") continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        scanDir(fullPath, baseDir, files, depth + 1);
      } else if (entry.name.endsWith(".md")) {
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const stat = fs.statSync(fullPath);
          const links: string[] = [];

          // Extract wiki-links [[target]]
          let match;
          while ((match = WIKI_LINK_RE.exec(content)) !== null) {
            links.push(match[1]);
          }
          // Extract markdown links [text](path.md)
          while ((match = MD_LINK_RE.exec(content)) !== null) {
            links.push(match[1]);
          }

          files.push({
            id: relPath,
            name: entry.name,
            path: relPath,
            size: stat.size,
            type: "md",
            links,
          });
        } catch {}
      }
    }
  } catch {}
}

export async function GET() {
  const files: FileNode[] = [];
  scanDir(WORKSPACE, WORKSPACE, files);

  // Build graph
  const fileMap = new Map(files.map((f) => [f.name.replace(".md", ""), f]));
  const pathMap = new Map(files.map((f) => [f.path, f]));

  const nodes = files.map((f) => ({
    id: f.id,
    label: f.name.replace(".md", ""),
    size: Math.max(3, Math.min(20, Math.log2(f.size / 100 + 1) * 4)),
    color: getColor(f.path),
    type: f.path.split("/")[0] || "root",
  }));

  const edgeSet = new Set<string>();
  const edges: { id: string; source: string; target: string }[] = [];

  for (const file of files) {
    for (const link of file.links) {
      // Try to resolve link to a file
      const cleanLink = link.replace(/^\.\//, "").replace(/\.md$/, "");
      const target = fileMap.get(cleanLink) || pathMap.get(link) || pathMap.get(link + ".md");
      if (target && target.id !== file.id) {
        const edgeId = [file.id, target.id].sort().join("--");
        if (!edgeSet.has(edgeId)) {
          edgeSet.add(edgeId);
          edges.push({ id: edgeId, source: file.id, target: target.id });
        }
      }
    }
  }

  return NextResponse.json({
    nodes,
    edges,
    stats: {
      totalFiles: files.length,
      totalLinks: edges.length,
      totalSize: files.reduce((a, f) => a + f.size, 0),
    },
  } as GraphData);
}
