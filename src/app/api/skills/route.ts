import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { SYSTEM_SKILLS_PATH, WORKSPACE_SKILLS_PATH } from "@/lib/paths";

export const dynamic = "force-dynamic";

interface SkillInfo {
  name: string;
  description: string;
  source: "system" | "workspace";
  location: string;
  hasSkillMd: boolean;
  files: string[];
  size: string;
}

export async function GET() {
  const skills: SkillInfo[] = [];

  // Scan both skill directories
  const dirs = [
    { path: SYSTEM_SKILLS_PATH, source: "system" as const },
    { path: WORKSPACE_SKILLS_PATH, source: "workspace" as const },
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir.path)) continue;

    const entries = fs.readdirSync(dir.path, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;

      const skillDir = path.join(dir.path, entry.name);
      const skillMdPath = path.join(skillDir, "SKILL.md");
      const hasSkillMd = fs.existsSync(skillMdPath);

      // Parse description from SKILL.md frontmatter or first paragraph
      let description = "No description available";
      if (hasSkillMd) {
        try {
          const content = fs.readFileSync(skillMdPath, "utf-8");
          // Try frontmatter summary first
          const summaryMatch = content.match(/summary:\s*["']?(.+?)["']?\s*$/m);
          if (summaryMatch) {
            description = summaryMatch[1];
          } else {
            // Try first non-heading, non-empty line
            const lines = content.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---") && !trimmed.startsWith("read_when")) {
                description = trimmed.slice(0, 200);
                break;
              }
            }
          }
        } catch {}
      }

      // List files in skill directory
      const files: string[] = [];
      let totalSize = 0;
      try {
        const allFiles = walkDir(skillDir, 2);
        for (const f of allFiles) {
          const rel = path.relative(skillDir, f);
          if (!rel.includes("node_modules")) {
            files.push(rel);
            try { totalSize += fs.statSync(f).size; } catch {}
          }
        }
      } catch {}

      skills.push({
        name: entry.name,
        description,
        source: dir.source,
        location: skillDir,
        hasSkillMd,
        files: files.slice(0, 20), // cap at 20
        size: formatSize(totalSize),
      });
    }
  }

  // Sort: workspace skills first, then alphabetical
  skills.sort((a, b) => {
    if (a.source !== b.source) return a.source === "workspace" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json({ skills, totalSystem: skills.filter(s => s.source === "system").length, totalWorkspace: skills.filter(s => s.source === "workspace").length });
}

function walkDir(dir: string, maxDepth: number, depth = 0): string[] {
  if (depth >= maxDepth) return [];
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile()) results.push(full);
      else if (entry.isDirectory() && !entry.name.startsWith(".")) {
        results.push(...walkDir(full, maxDepth, depth + 1));
      }
    }
  } catch {}
  return results;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
