"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { GitFork, GitCommit, GitPullRequest, ExternalLink, Globe, Lock, RefreshCw, User } from "lucide-react";

interface GitData {
  user: { login: string; name: string };
  repos: Array<{ name: string; fullName: string; description: string; url: string; visibility: string; language: string; updatedAt: string; stars: number; defaultBranch: string }>;
  recentCommits: Array<{ hash: string; message: string; date: string; author: string }>;
  prs: Array<{ title: string; number: number; state: string; repo: string; url: string }>;
  totalRepos: number;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178C6", JavaScript: "#F7DF1E", Python: "#3776AB", HTML: "#E34F26",
  CSS: "#1572B6", Shell: "#89E051", Unknown: "var(--text-muted)",
};

export default function GitPage() {
  const [data, setData] = useState<GitData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = () => { setLoading(true); fetch("/api/git").then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); };
  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Git / GitHub</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="rounded-xl p-6 animate-pulse" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}><div className="h-8 rounded w-1/2" style={{ backgroundColor: "var(--border)" }} /></div>)}</div>
    </div>
  );

  const d = data!;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Git / GitHub</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Repositories, commits, and pull requests</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
            <User className="w-3.5 h-3.5" style={{ color: "var(--accent)" }} />
            <span className="text-xs font-mono" style={{ color: "var(--text-primary)" }}>{d.user.login}</span>
          </div>
          <button onClick={fetchData} className="btn-primary text-sm" style={{ padding: "8px 16px" }}><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Repositories" value={d.totalRepos} icon={<GitFork />} iconColor="var(--accent)" subtitle={`${d.repos.filter(r => r.visibility === "PUBLIC").length} public, ${d.repos.filter(r => r.visibility === "PRIVATE").length} private`} />
        <StatsCard title="Recent Commits" value={d.recentCommits.length} icon={<GitCommit />} iconColor="var(--positive)" subtitle="Mission Control repo" />
        <StatsCard title="Pull Requests" value={d.prs.length} icon={<GitPullRequest />} iconColor="var(--info)" subtitle="Your recent PRs" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Repos */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <GitFork className="w-5 h-5" style={{ color: "var(--accent)" }} /> Repositories
          </h2>
          <div className="space-y-2">
            {d.repos.map((repo) => (
              <a key={repo.fullName} href={repo.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg transition-colors"
                style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)", textDecoration: "none" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{repo.name}</span>
                    {repo.visibility === "PRIVATE" ? <Lock className="w-3 h-3" style={{ color: "var(--text-muted)" }} /> : <Globe className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                  </div>
                  {repo.description && <div className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{repo.description}</div>}
                </div>
                <div className="flex items-center gap-3 ml-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: LANG_COLORS[repo.language] || "var(--text-muted)" }} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{repo.language}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                </div>
              </a>
            ))}
            {d.repos.length === 0 && <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>No repos found (is gh CLI authenticated?)</p>}
          </div>
        </div>

        {/* Recent Commits */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <GitCommit className="w-5 h-5" style={{ color: "var(--accent)" }} /> Recent Commits (Mission Control)
          </h2>
          <div className="space-y-2">
            {d.recentCommits.map((c) => (
              <div key={c.hash} className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)" }}>
                <span className="text-xs font-mono px-1.5 py-0.5 rounded mt-0.5" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>{c.hash}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{c.message}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{new Date(c.date).toLocaleDateString()} · {c.author}</div>
                </div>
              </div>
            ))}
            {d.recentCommits.length === 0 && <p className="text-sm text-center py-4" style={{ color: "var(--text-muted)" }}>No commits found</p>}
          </div>
        </div>
      </div>

      {/* PRs */}
      {d.prs.length > 0 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <GitPullRequest className="w-5 h-5" style={{ color: "var(--accent)" }} /> Pull Requests
          </h2>
          <div className="space-y-2">
            {d.prs.map((pr) => (
              <a key={pr.number} href={pr.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)", textDecoration: "none" }}>
                <div>
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>#{pr.number} {pr.title}</span>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{pr.repo}</div>
                </div>
                <span className={`badge ${pr.state === "OPEN" ? "badge-success" : pr.state === "MERGED" ? "badge-info" : "badge-error"}`}>{pr.state}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
