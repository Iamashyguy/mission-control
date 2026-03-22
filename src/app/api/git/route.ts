import { NextResponse } from "next/server";
import { execSync } from "child_process";

export const dynamic = "force-dynamic";

const ENV = { ...process.env, PATH: `${process.env.PATH}:/opt/homebrew/bin:/usr/local/bin` };

export async function GET() {
  const repos: Array<{
    name: string; fullName: string; description: string; url: string;
    visibility: string; language: string; updatedAt: string; stars: number; defaultBranch: string;
  }> = [];

  // Fetch repos via gh CLI
  try {
    const output = execSync(
      'gh repo list --json name,nameWithOwner,description,url,visibility,primaryLanguage,updatedAt,stargazerCount,defaultBranchRef --limit 20 2>/dev/null',
      { encoding: "utf-8", timeout: 15000, env: ENV }
    );
    const parsed = JSON.parse(output);
    for (const r of parsed) {
      repos.push({
        name: r.name || "",
        fullName: r.nameWithOwner || "",
        description: r.description || "",
        url: r.url || "",
        visibility: r.visibility || "PRIVATE",
        language: r.primaryLanguage?.name || "Unknown",
        updatedAt: r.updatedAt || "",
        stars: r.stargazerCount || 0,
        defaultBranch: r.defaultBranchRef?.name || "main",
      });
    }
  } catch {}

  // Recent commits on mission-control
  let recentCommits: Array<{ hash: string; message: string; date: string; author: string }> = [];
  try {
    const gitLog = execSync(
      'cd ~/.openclaw/workspace/mission-control && git log --format="%H|%s|%ai|%an" -10 2>/dev/null',
      { encoding: "utf-8", timeout: 5000, env: ENV }
    );
    recentCommits = gitLog.trim().split("\n").filter(Boolean).map((line) => {
      const [hash, message, date, author] = line.split("|");
      return { hash: hash?.slice(0, 7) || "", message: message || "", date: date || "", author: author || "" };
    });
  } catch {}

  // GitHub user info
  let user = { login: "unknown", name: "" };
  try {
    const uOutput = execSync('gh api user --jq ".login,.name" 2>/dev/null', { encoding: "utf-8", timeout: 5000, env: ENV });
    const [login, name] = uOutput.trim().split("\n");
    user = { login: login || "unknown", name: name || "" };
  } catch {}

  // Recent PRs
  let prs: Array<{ title: string; number: number; state: string; repo: string; url: string }> = [];
  try {
    const prOutput = execSync(
      'gh pr list --author @me --state all --json title,number,state,headRepository,url --limit 5 2>/dev/null || echo "[]"',
      { encoding: "utf-8", timeout: 10000, env: ENV }
    );
    const parsed = JSON.parse(prOutput);
    prs = parsed.map((p: Record<string, unknown>) => ({
      title: p.title || "", number: p.number || 0, state: p.state || "",
      repo: (p.headRepository as Record<string, string>)?.name || "", url: p.url || "",
    }));
  } catch {}

  return NextResponse.json({
    user,
    repos,
    recentCommits,
    prs,
    totalRepos: repos.length,
  });
}
