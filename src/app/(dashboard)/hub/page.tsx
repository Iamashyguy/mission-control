"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import SystemMonitor from "@/components/SystemMonitor";
import { Bot, DollarSign, Activity, AlertTriangle, Cpu, Clock, Timer, History, Globe, Zap, Sun, Coffee, FileText, GitCommit, CheckCircle2 } from "lucide-react";

interface HubData {
  agents: { total: number; active: number; names?: string[] };
  costs: { today: number; month: number; projected: number; savings?: number };
  sessions: { active: number; total: number; totalTokens?: number; models?: number };
  crons: { total: number; active: number; nextRun?: string | null };
  errors: { today: number; unresolved: number };
  discover: { sites: number };
  system: { cpu: number; ram: number; uptime: string };
  recentActivity: Array<{
    id: string;
    agent: string;
    action: string;
    time: string;
    status: "success" | "error" | "info";
  }>;
}

export default function HubPage() {
  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/hub");
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error("Failed to fetch hub data:", e);
      }
      setLoading(false);
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Hub
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl p-6 animate-pulse" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="h-4 rounded w-1/2 mb-4" style={{ backgroundColor: "var(--border)" }} />
              <div className="h-8 rounded w-2/3" style={{ backgroundColor: "var(--border)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const d = data || {
    agents: { total: 0, active: 0, names: [] },
    costs: { today: 0, month: 0, projected: 0, savings: 0 },
    sessions: { active: 0, total: 0, totalTokens: 0, models: 0 },
    crons: { total: 0, active: 0, nextRun: null },
    errors: { today: 0, unresolved: 0 },
    discover: { sites: 0 },
    system: { cpu: 0, ram: 0, uptime: "0h" },
    recentActivity: [],
  };

  const formatTokens = (t: number) => {
    if (t >= 1000000) return `${(t / 1000000).toFixed(1)}M`;
    if (t >= 1000) return `${(t / 1000).toFixed(0)}K`;
    return String(t);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
          >
            Hub
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Overview of your entire operation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "var(--positive)",
            }}
          />
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            All systems operational
          </span>
        </div>
      </div>

      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Agents"
          value={`${d.agents.active}/${d.agents.total}`}
          icon={<Bot />}
          iconColor="var(--accent)"
          subtitle="All online"
        />
        <StatsCard
          title="Monthly Cost"
          value={`$${d.costs.month}`}
          icon={<DollarSign />}
          iconColor="var(--positive)"
          subtitle={`Saving $${d.costs.savings || 0}/mo vs API`}
        />
        <StatsCard
          title="Sessions"
          value={d.sessions.total}
          icon={<History />}
          iconColor="var(--info)"
          subtitle={`${d.sessions.active} active · ${formatTokens(d.sessions.totalTokens || 0)} tokens`}
        />
        <StatsCard
          title="Cron Jobs"
          value={`${d.crons.active}/${d.crons.total}`}
          icon={<Timer />}
          iconColor="#f9e2af"
          subtitle={d.crons.nextRun ? `Next: ${new Date(d.crons.nextRun).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "All scheduled"}
        />
      </div>

      {/* Stats Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="System"
          value={`${d.system.cpu}% CPU`}
          icon={<Cpu />}
          iconColor="#94e2d5"
          subtitle={`RAM ${d.system.ram}% · Up ${d.system.uptime}`}
        />
        <StatsCard
          title="Discover Sites"
          value={d.discover.sites}
          icon={<Globe />}
          iconColor="#89b4fa"
          subtitle="Active sites"
        />
        <StatsCard
          title="Models"
          value={d.sessions.models || 0}
          icon={<Zap />}
          iconColor="#cba6f7"
          subtitle="Unique models in use"
        />
        <StatsCard
          title="Errors"
          value={d.errors.unresolved}
          icon={<AlertTriangle />}
          iconColor={d.errors.unresolved > 0 ? "var(--error)" : "var(--positive)"}
          subtitle={d.errors.unresolved === 0 ? "All clear ✨" : `${d.errors.today} today`}
        />
      </div>

      {/* Morning Standup / Daily Brief */}
      <DailyStandup />

      {/* Live System Monitor */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          <Cpu className="w-5 h-5" style={{ color: "var(--accent)" }} />
          System Monitor
          <span className="text-xs font-normal px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(166, 227, 161, 0.15)", color: "var(--positive)" }}>
            LIVE
          </span>
        </h2>
        <SystemMonitor />
      </div>

      {/* Two columns: Agent Status + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Status Grid */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <h2
            className="text-lg font-semibold mb-4 flex items-center gap-2"
            style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
          >
            <Bot className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Agent Status
          </h2>
          <AgentStatusGrid />
        </div>

        {/* Recent Activity */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <h2
            className="text-lg font-semibold mb-4 flex items-center gap-2"
            style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
          >
            <Activity className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Recent Activity
          </h2>
          <RecentActivityFeed activities={d.recentActivity} />
        </div>
      </div>

      {/* System Quick View */}
      <div
        className="rounded-xl p-6"
        style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
      >
        <h2
          className="text-lg font-semibold mb-4 flex items-center gap-2"
          style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}
        >
          <Cpu className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Quick Links
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Cost Tracker", href: "/costs", emoji: "💰" },
            { label: "Discover Sites", href: "/discover", emoji: "🔍" },
            { label: "Agents", href: "/agents", emoji: "🤖" },
            { label: "Cron Manager", href: "/crons", emoji: "⏰" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 p-3 rounded-lg transition-colors"
              style={{
                backgroundColor: "var(--surface-elevated)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <span style={{ fontSize: "20px" }}>{link.emoji}</span>
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {link.label}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// Sub-components
function AgentStatusGrid() {
  const [agents, setAgents] = useState<
    Array<{ id: string; name: string; emoji: string; model: string; status: string; lastActive: string }>
  >([]);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => setAgents(data.agents || []))
      .catch(() => {});
  }, []);

  if (agents.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading agents...</p>;
  }

  return (
    <div className="space-y-2">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className="flex items-center justify-between p-3 rounded-lg"
          style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "18px" }}>{agent.emoji || "🤖"}</span>
            <div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {agent.name}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {agent.model}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: agent.status === "active" ? "var(--positive)" : "var(--text-muted)",
              }}
            />
            <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {agent.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentActivityFeed({
  activities,
}: {
  activities: Array<{ id: string; agent: string; action: string; time: string; status: string }>;
}) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No recent activity
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between p-3 rounded-lg"
          style={{ backgroundColor: "var(--surface-elevated)" }}
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor:
                  a.status === "success" ? "var(--positive)" : a.status === "error" ? "var(--error)" : "var(--info)",
              }}
            />
            <div>
              <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                {a.action}
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {a.agent}
              </div>
            </div>
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {a.time}
          </span>
        </div>
      ))}
    </div>
  );
}

// Daily Standup Component
function DailyStandup() {
  const [standup, setStandup] = useState<{
    greeting: string;
    summary: string[];
    todayPlan: string[];
    blockers: string[];
    recentCommits: Array<{ repo: string; message: string; time: string }>;
    memoryUpdates: number;
  } | null>(null);

  useEffect(() => {
    const fetchStandup = async () => {
      try {
        // Build standup from multiple sources
        const [hubRes, gitRes] = await Promise.all([
          fetch("/api/hub"),
          fetch("/api/git"),
        ]);
        const hub = hubRes.ok ? await hubRes.json() : {};
        const git = gitRes.ok ? await gitRes.json() : {};

        const hour = new Date().getHours();
        const greeting = hour < 12 ? "Good Morning ☀️" : hour < 17 ? "Good Afternoon 👋" : "Good Evening 🌙";

        const summary: string[] = [];
        if (hub.sessions?.total) summary.push(`${hub.sessions.total} sessions tracked (${hub.sessions.active} active)`);
        if (hub.crons?.total) summary.push(`${hub.crons.total} cron jobs running`);
        if (hub.discover?.sites) summary.push(`${hub.discover.sites} Discover sites monitored`);
        if (hub.system?.uptime) summary.push(`System uptime: ${hub.system.uptime}`);

        const todayPlan: string[] = [];
        if (hub.crons?.nextRun) todayPlan.push(`Next cron: ${new Date(hub.crons.nextRun).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`);
        todayPlan.push("Check agent health & session stats");
        todayPlan.push("Review memory updates & decisions");

        const blockers: string[] = [];
        if (hub.errors?.unresolved > 0) blockers.push(`${hub.errors.unresolved} unresolved errors need attention`);
        if (hub.system?.ram > 90) blockers.push(`RAM at ${hub.system.ram}% — consider cleanup`);

        const repos = Array.isArray(git) ? git : git.repos || [];
        const recentCommits = repos
          .filter((r: { lastCommit?: string }) => r.lastCommit)
          .slice(0, 3)
          .map((r: { name: string; lastCommit: string; lastCommitDate?: string }) => ({
            repo: r.name,
            message: r.lastCommit,
            time: r.lastCommitDate || "",
          }));

        setStandup({
          greeting,
          summary,
          todayPlan,
          blockers,
          recentCommits,
          memoryUpdates: hub.recentActivity?.length || 0,
        });
      } catch {}
    };
    fetchStandup();
  }, []);

  if (!standup) return null;

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          <Coffee className="w-5 h-5" style={{ color: "#f9e2af" }} />
          {standup.greeting} Ashish
        </h2>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", month: "long", day: "numeric" })}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* What happened */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: "#a6e3a1" }}>
            <CheckCircle2 className="w-3 h-3" /> System Status
          </h3>
          {standup.summary.map((s, i) => (
            <div key={i} className="text-xs flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "#a6e3a1" }}>•</span> {s}
            </div>
          ))}
        </div>

        {/* Today's plan */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: "#89b4fa" }}>
            <Sun className="w-3 h-3" /> Today's Focus
          </h3>
          {standup.todayPlan.map((p, i) => (
            <div key={i} className="text-xs flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "#89b4fa" }}>→</span> {p}
            </div>
          ))}
        </div>

        {/* Blockers + Recent Commits */}
        <div className="space-y-2">
          {standup.blockers.length > 0 ? (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: "#f38ba8" }}>
                <AlertTriangle className="w-3 h-3" /> Needs Attention
              </h3>
              {standup.blockers.map((b, i) => (
                <div key={i} className="text-xs flex items-start gap-2" style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "#f38ba8" }}>⚠</span> {b}
                </div>
              ))}
            </>
          ) : (
            <>
              <h3 className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: "#cba6f7" }}>
                <GitCommit className="w-3 h-3" /> Recent Commits
              </h3>
              {standup.recentCommits.length > 0 ? standup.recentCommits.map((c, i) => (
                <div key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span className="font-mono" style={{ color: "#cba6f7" }}>{c.repo}</span>: {c.message}
                </div>
              )) : (
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>No recent commits</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
