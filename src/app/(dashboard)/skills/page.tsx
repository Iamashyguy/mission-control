"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  Puzzle,
  FolderOpen,
  Package,
  FileText,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface Skill {
  name: string;
  description: string;
  source: "system" | "workspace";
  location: string;
  hasSkillMd: boolean;
  files: string[];
  size: string;
}

interface SkillsData {
  skills: Skill[];
  totalSystem: number;
  totalWorkspace: number;
}

export default function SkillsPage() {
  const [data, setData] = useState<SkillsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "system" | "workspace">("all");

  useEffect(() => {
    fetch("/api/skills")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Skills
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl p-6 animate-pulse" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="h-4 rounded w-2/3 mb-3" style={{ backgroundColor: "var(--border)" }} />
              <div className="h-3 rounded w-full mb-2" style={{ backgroundColor: "var(--border)" }} />
              <div className="h-3 rounded w-3/4" style={{ backgroundColor: "var(--border)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const d = data!;
  const filtered = d.skills.filter((s) =>
    filter === "all" ? true : s.source === filter
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Skills
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Installed agent skills and capabilities
          </p>
        </div>
        <a
          href="https://clawhub.com"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-sm"
          style={{ padding: "8px 16px", textDecoration: "none" }}
        >
          <ExternalLink className="w-4 h-4" />
          Find Skills
        </a>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Skills"
          value={d.skills.length}
          icon={<Puzzle />}
          iconColor="var(--accent)"
          subtitle="Installed and available"
        />
        <StatsCard
          title="System Skills"
          value={d.totalSystem}
          icon={<Package />}
          iconColor="var(--info)"
          subtitle="Built-in with OpenClaw"
        />
        <StatsCard
          title="Workspace Skills"
          value={d.totalWorkspace}
          icon={<FolderOpen />}
          iconColor="var(--positive)"
          subtitle="Custom / user-created"
        />
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["all", "workspace", "system"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
            style={{
              backgroundColor: filter === f ? "var(--accent-soft)" : "var(--surface-elevated)",
              color: filter === f ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${filter === f ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            {f === "all" ? `All (${d.skills.length})` : f === "workspace" ? `Workspace (${d.totalWorkspace})` : `System (${d.totalSystem})`}
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((skill) => (
          <div
            key={`${skill.source}-${skill.name}`}
            className="rounded-xl overflow-hidden transition-all"
            style={{
              backgroundColor: "var(--card)",
              border: `1px solid ${expandedSkill === skill.name ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            {/* Card Header */}
            <button
              onClick={() => setExpandedSkill(expandedSkill === skill.name ? null : skill.name)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Puzzle className="w-4 h-4" style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    {skill.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${skill.source === "workspace" ? "badge-success" : "badge-info"}`}>
                    {skill.source}
                  </span>
                  {expandedSkill === skill.name ? (
                    <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                  )}
                </div>
              </div>
              <p className="text-xs line-clamp-2" style={{ color: "var(--text-secondary)", lineHeight: "1.5" }}>
                {skill.description}
              </p>
            </button>

            {/* Expanded Detail */}
            {expandedSkill === skill.name && (
              <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="pt-3 space-y-3">
                  {/* Meta */}
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: "var(--text-muted)" }}>Size</span>
                    <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{skill.size}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: "var(--text-muted)" }}>SKILL.md</span>
                    <span className={`badge ${skill.hasSkillMd ? "badge-success" : "badge-error"}`}>
                      {skill.hasSkillMd ? "Present" : "Missing"}
                    </span>
                  </div>

                  {/* Files */}
                  {skill.files.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
                        Files ({skill.files.length})
                      </div>
                      <div
                        className="rounded-lg p-2 space-y-0.5 max-h-32 overflow-y-auto"
                        style={{ backgroundColor: "var(--surface-elevated)" }}
                      >
                        {skill.files.map((f) => (
                          <div key={f} className="flex items-center gap-1.5 text-xs">
                            <FileText className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                            <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div className="text-xs font-mono p-2 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)", wordBreak: "break-all" }}>
                    {skill.location.replace(/.*\.openclaw/, "~/.openclaw").replace(/\/opt\/homebrew\/lib\/node_modules\/openclaw/, "openclaw")}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <Puzzle className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No skills found for this filter</p>
        </div>
      )}
    </div>
  );
}
