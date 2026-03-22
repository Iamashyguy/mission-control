import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { OPENCLAW_WORKSPACE, OPENCLAW_CONFIG, WORKSPACE_MEMORY } from "@/lib/paths";

export const dynamic = "force-dynamic";

interface SearchResult {
  title: string;
  type: "page" | "memory" | "setting" | "file" | "cron";
  path: string;
  snippet: string;
  icon: string;
}

const PAGES = [
  { title: "Hub", path: "/hub", icon: "🏠", keywords: "dashboard overview home stats" },
  { title: "Agents & System", path: "/agents", icon: "🤖", keywords: "cpu ram disk agent dev discover influencer system" },
  { title: "Cost Tracker", path: "/costs", icon: "💰", keywords: "cost budget money spending tokens pricing" },
  { title: "Discover Sites", path: "/discover", icon: "🔍", keywords: "sites google discover publishing traffic" },
  { title: "Docs / Files", path: "/docs", icon: "📁", keywords: "files documents browser workspace" },
  { title: "Cron Manager", path: "/crons", icon: "⏰", keywords: "cron jobs schedule timer automation" },
  { title: "Activity Feed", path: "/activity", icon: "📊", keywords: "activity log events actions" },
  { title: "Memory Browser", path: "/memory", icon: "🧠", keywords: "memory daily files notes journal" },
  { title: "Sessions", path: "/sessions", icon: "💬", keywords: "sessions chat conversations" },
  { title: "Logs", path: "/logs", icon: "📋", keywords: "logs gateway errors debug" },
  { title: "Settings", path: "/settings", icon: "⚙️", keywords: "settings config models channels agents" },
  { title: "Skills", path: "/skills", icon: "🧩", keywords: "skills plugins extensions" },
  { title: "Terminal", path: "/terminal", icon: "💻", keywords: "terminal shell command line cli" },
  { title: "Backup Manager", path: "/backup", icon: "💾", keywords: "backup restore files" },
  { title: "Daily Journal", path: "/journal", icon: "📝", keywords: "journal diary daily notes" },
  { title: "Compliance", path: "/compliance", icon: "🏢", keywords: "compliance tax filing company" },
  { title: "Email Hub", path: "/email", icon: "📧", keywords: "email inbox messages" },
  { title: "Finance", path: "/finance", icon: "🏦", keywords: "finance bank accounts money" },
  { title: "Calendar", path: "/calendar", icon: "📅", keywords: "calendar events schedule deadlines" },
  { title: "Notifications", path: "/notifications", icon: "🔔", keywords: "notifications alerts" },
  { title: "Security", path: "/security", icon: "🔒", keywords: "security audit firewall ssh keys" },
  { title: "Git / GitHub", path: "/git", icon: "🌿", keywords: "git github repos commits pull requests" },
  { title: "Revenue", path: "/revenue", icon: "📈", keywords: "revenue income adsense affiliate" },
  { title: "YouTube", path: "/youtube", icon: "📺", keywords: "youtube video channel content" },
  { title: "Workflows", path: "/workflows", icon: "🔄", keywords: "workflows automation pipeline" },
  { title: "3D Office", path: "/office3d", icon: "🎮", keywords: "3d office virtual agents" },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") || "").toLowerCase().trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], query });
  }

  const results: SearchResult[] = [];
  const maxResults = 15;

  // 1. Search pages
  for (const page of PAGES) {
    if (results.length >= maxResults) break;
    const searchText = `${page.title} ${page.keywords}`.toLowerCase();
    if (searchText.includes(query)) {
      results.push({
        title: page.title,
        type: "page",
        path: page.path,
        snippet: `Navigate to ${page.title}`,
        icon: page.icon,
      });
    }
  }

  // 2. Search memory files
  try {
    if (fs.existsSync(WORKSPACE_MEMORY)) {
      const files = fs.readdirSync(WORKSPACE_MEMORY).filter(f => f.endsWith(".md")).sort().reverse();
      for (const file of files) {
        if (results.length >= maxResults) break;
        const fp = path.join(WORKSPACE_MEMORY, file);
        try {
          const content = fs.readFileSync(fp, "utf-8").toLowerCase();
          if (content.includes(query) || file.toLowerCase().includes(query)) {
            const lines = content.split("\n");
            const matchLine = lines.find(l => l.includes(query)) || lines[0];
            results.push({
              title: file.replace(".md", ""),
              type: "memory",
              path: `/memory?file=memory/${file}`,
              snippet: matchLine.slice(0, 120).trim(),
              icon: "🧠",
            });
          }
        } catch {}
      }
    }
  } catch {}

  // 3. Search workspace root files
  try {
    const rootFiles = fs.readdirSync(OPENCLAW_WORKSPACE).filter(f => f.endsWith(".md") && !f.startsWith("."));
    for (const file of rootFiles) {
      if (results.length >= maxResults) break;
      const fp = path.join(OPENCLAW_WORKSPACE, file);
      try {
        const content = fs.readFileSync(fp, "utf-8").toLowerCase();
        if (content.includes(query) || file.toLowerCase().includes(query)) {
          const lines = content.split("\n");
          const matchLine = lines.find(l => l.includes(query)) || lines[0];
          results.push({
            title: file,
            type: "file",
            path: `/docs?file=${file}`,
            snippet: matchLine.slice(0, 120).trim(),
            icon: "📄",
          });
        }
      } catch {}
    }
  } catch {}

  // 4. Search settings (model names, agent names)
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, "utf-8"));
    const configStr = JSON.stringify(config).toLowerCase();
    if (configStr.includes(query)) {
      results.push({
        title: "OpenClaw Config",
        type: "setting",
        path: "/settings",
        snippet: `Match found in openclaw.json for "${query}"`,
        icon: "⚙️",
      });
    }
  } catch {}

  return NextResponse.json({ results, query, total: results.length });
}
