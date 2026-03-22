"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { Bot, DollarSign, Activity, AlertTriangle, Cpu, Clock } from "lucide-react";

interface HubData {
  agents: { total: number; active: number };
  costs: { today: number; month: number; projected: number };
  sessions: { active: number; today: number };
  errors: { today: number; unresolved: number };
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
    agents: { total: 0, active: 0 },
    costs: { today: 0, month: 0, projected: 0 },
    sessions: { active: 0, today: 0 },
    errors: { today: 0, unresolved: 0 },
    system: { cpu: 0, ram: 0, uptime: "0h" },
    recentActivity: [],
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Agents"
          value={`${d.agents.active}/${d.agents.total}`}
          icon={<Bot />}
          iconColor="var(--accent)"
          subtitle="Active / Total"
        />
        <StatsCard
          title="Today's Cost"
          value={`$${d.costs.today.toFixed(2)}`}
          icon={<DollarSign />}
          iconColor="var(--positive)"
          subtitle={`Month: $${d.costs.month.toFixed(2)}`}
        />
        <StatsCard
          title="Sessions Today"
          value={d.sessions.today}
          icon={<Activity />}
          iconColor="var(--info)"
          subtitle={`${d.sessions.active} active now`}
        />
        <StatsCard
          title="Errors"
          value={d.errors.unresolved}
          icon={<AlertTriangle />}
          iconColor={d.errors.unresolved > 0 ? "var(--error)" : "var(--positive)"}
          subtitle={`${d.errors.today} today`}
        />
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
