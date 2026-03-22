"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  Settings,
  Server,
  Bot,
  Cpu,
  DollarSign,
  Radio,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Check,
  AlertTriangle,
  Globe,
} from "lucide-react";

interface SettingsData {
  models: Array<{
    id: string;
    provider: string;
    model: string;
    authType: string;
    context1m: boolean;
    cacheRetention: string;
    isDefault: boolean;
  }>;
  agents: Array<{
    id: string;
    model: string;
    workspace: string;
    crons: number;
  }>;
  crons: Array<{
    name: string;
    schedule: string;
    agent: string;
    model: string;
    enabled: boolean;
  }>;
  systemInfo: {
    hostname: string;
    platform: string;
    nodeVersion: string;
    nextVersion: string;
    totalMemory: string;
    cpus: number;
    openclawDir: string;
    workspaceDir: string;
  };
  gatewayInfo: {
    bind: string;
    remoteUrl: string;
  };
  channels: Array<{ name: string; enabled: boolean }>;
  budget: {
    monthlyBudget: number;
    subscriptionCost: number;
    minimaxCost: number;
    apiBackupBudget: number;
  };
  configPath: string;
  configSize: string;
}

export default function SettingsPage() {
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["models", "agents", "system", "channels", "budget"])
  );

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const refresh = () => {
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Settings
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl p-6 animate-pulse" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="h-4 rounded w-1/2 mb-4" style={{ backgroundColor: "var(--border)" }} />
              <div className="h-8 rounded w-2/3" style={{ backgroundColor: "var(--border)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const d = data!;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            OpenClaw configuration overview (read-only)
          </p>
        </div>
        <button onClick={refresh} className="btn-primary text-sm" style={{ padding: "8px 16px" }}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Models Configured"
          value={d.models.length}
          icon={<Cpu />}
          iconColor="var(--accent)"
          subtitle={`${new Set(d.models.map(m => m.provider)).size} providers`}
        />
        <StatsCard
          title="Agents"
          value={d.agents.length}
          icon={<Bot />}
          iconColor="var(--positive)"
          subtitle={`${d.crons.filter(c => c.enabled).length} active crons`}
        />
        <StatsCard
          title="Monthly Budget"
          value={`$${d.budget.monthlyBudget}`}
          icon={<DollarSign />}
          iconColor="var(--warning)"
          subtitle={`Sub: $${d.budget.subscriptionCost} + MM: $${d.budget.minimaxCost}`}
        />
        <StatsCard
          title="Channels"
          value={d.channels.filter(c => c.enabled).length}
          icon={<Radio />}
          iconColor="var(--info)"
          subtitle={`${d.channels.length} total configured`}
        />
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-4">
        {/* Models Section */}
        <CollapsibleSection
          id="models"
          title="Model Configuration"
          icon={<Cpu className="w-5 h-5" />}
          expanded={expandedSections.has("models")}
          onToggle={() => toggleSection("models")}
          badge={`${d.models.length} models`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Model</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Provider</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Auth</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Context 1M</th>
                  <th className="text-left py-2 px-3 font-medium" style={{ color: "var(--text-secondary)" }}>Cache</th>
                </tr>
              </thead>
              <tbody>
                {d.models.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-xs" style={{ color: "var(--text-primary)" }}>{m.model}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="badge badge-info">{m.provider}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`badge ${m.authType === "token" ? "badge-success" : m.authType === "api_key" ? "badge-warning" : "badge-info"}`}>
                        {m.authType === "token" ? "🔑 Token" : m.authType === "api_key" ? "💳 API Key" : m.authType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {m.context1m ? (
                        <span className="badge badge-error">
                          <AlertTriangle className="w-3 h-3 mr-1" /> ON (risky!)
                        </span>
                      ) : (
                        <span className="badge badge-success">
                          <Check className="w-3 h-3 mr-1" /> OFF
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{m.cacheRetention}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {/* Agents Section */}
        <CollapsibleSection
          id="agents"
          title="Agent Configuration"
          icon={<Bot className="w-5 h-5" />}
          expanded={expandedSections.has("agents")}
          onToggle={() => toggleSection("agents")}
          badge={`${d.agents.length} agents`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {d.agents.map((agent) => {
              const emojiMap: Record<string, string> = { main: "⚡", discover: "🔍", influencer: "🎭" };
              const nameMap: Record<string, string> = { main: "Dev", discover: "Discover Agent", influencer: "AI Influencer" };
              return (
                <div
                  key={agent.id}
                  className="rounded-lg p-4"
                  style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ fontSize: "20px" }}>{emojiMap[agent.id] || "🤖"}</span>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        {nameMap[agent.id] || agent.id}
                      </div>
                      <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{agent.id}</div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <InfoRow label="Model" value={agent.model.includes("/") ? agent.model.split("/").pop()! : agent.model} />
                    <InfoRow label="Crons" value={`${agent.crons} jobs`} />
                    {agent.workspace && (
                      <InfoRow label="Workspace" value={agent.workspace.replace(/.*\//, "~/")} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleSection>

        {/* System Info Section */}
        <CollapsibleSection
          id="system"
          title="System Information"
          icon={<Server className="w-5 h-5" />}
          expanded={expandedSections.has("system")}
          onToggle={() => toggleSection("system")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                Machine
              </h3>
              <InfoRow label="Hostname" value={d.systemInfo.hostname} />
              <InfoRow label="Platform" value={d.systemInfo.platform} />
              <InfoRow label="CPUs" value={`${d.systemInfo.cpus} cores`} />
              <InfoRow label="Memory" value={d.systemInfo.totalMemory} />
              <InfoRow label="Node.js" value={d.systemInfo.nodeVersion} />
              <InfoRow label="Next.js" value={d.systemInfo.nextVersion} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                OpenClaw
              </h3>
              <InfoRow label="Config" value={d.configPath.replace(/.*\.openclaw/, "~/.openclaw")} />
              <InfoRow label="Config Size" value={d.configSize} />
              <InfoRow label="OpenClaw Dir" value={d.systemInfo.openclawDir.replace(/.*\.openclaw/, "~/.openclaw")} />
              <InfoRow label="Workspace" value={d.systemInfo.workspaceDir.replace(/.*\.openclaw/, "~/.openclaw")} />
              <InfoRow label="Gateway" value={d.gatewayInfo.bind} />
              <InfoRow label="Remote URL" value={d.gatewayInfo.remoteUrl === "none" ? "Not configured" : d.gatewayInfo.remoteUrl} />
            </div>
          </div>
        </CollapsibleSection>

        {/* Channels Section */}
        <CollapsibleSection
          id="channels"
          title="Channels & Plugins"
          icon={<Globe className="w-5 h-5" />}
          expanded={expandedSections.has("channels")}
          onToggle={() => toggleSection("channels")}
          badge={`${d.channels.filter(c => c.enabled).length} active`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {d.channels.map((ch) => (
              <div
                key={ch.name}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <ChannelIcon name={ch.name} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {ch.name.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <span className={`badge ${ch.enabled ? "badge-success" : "badge-error"}`}>
                  {ch.enabled ? "Active" : "Disabled"}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Budget Section */}
        <CollapsibleSection
          id="budget"
          title="Budget Configuration"
          icon={<DollarSign className="w-5 h-5" />}
          expanded={expandedSections.has("budget")}
          onToggle={() => toggleSection("budget")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <BudgetRow label="Claude Max Subscription" amount={d.budget.subscriptionCost} color="var(--accent)" desc="Opus + Sonnet (unlimited)" />
              <BudgetRow label="MiniMax Plus" amount={d.budget.minimaxCost} color="var(--info)" desc="Mechanical crons, heartbeats, subagents" />
              <BudgetRow label="API Backup Reserve" amount={d.budget.apiBackupBudget} color="var(--warning)" desc="Emergency fallback only" />
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Total Monthly</span>
                  <span className="text-lg font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
                    ${d.budget.monthlyBudget}/mo
                  </span>
                </div>
                <div className="text-xs mt-1" style={{ color: "var(--positive)" }}>
                  ↓ $980/mo savings from previous $1,200/mo setup
                </div>
              </div>
            </div>
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                Model Routing Rules
              </h3>
              <div className="space-y-2 text-xs">
                <RoutingRow usage="Main Chat" model="Opus 4.6" source="Subscription" />
                <RoutingRow usage="Analytical Crons" model="Sonnet 4.6" source="Subscription" />
                <RoutingRow usage="Mechanical Crons" model="MiniMax M2.7" source="Plus Plan" />
                <RoutingRow usage="Heartbeats" model="MiniMax M2.7" source="Plus Plan" />
                <RoutingRow usage="Subagents" model="MiniMax M2.7" source="Plus Plan" />
                <RoutingRow usage="Discover Agent" model="MiniMax M2.7" source="Plus Plan" />
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "8px" }}>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Fallback: Opus Sub → API Key → GPT 5.1 → Gemini Flash
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Footer note */}
      <div className="text-center py-4">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Settings are read-only. Edit <span className="font-mono">~/.openclaw/openclaw.json</span> to make changes.
        </p>
      </div>
    </div>
  );
}

// Sub-components

function CollapsibleSection({
  id,
  title,
  icon,
  expanded,
  onToggle,
  badge,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 transition-colors"
        style={{ color: "var(--text-primary)" }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
      >
        <div style={{ color: "var(--accent)" }}>{icon}</div>
        <span className="text-base font-semibold" style={{ fontFamily: "var(--font-heading)" }}>{title}</span>
        {badge && <span className="badge badge-info ml-2">{badge}</span>}
        <div className="ml-auto" style={{ color: "var(--text-muted)" }}>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-xs font-medium font-mono" style={{ color: "var(--text-secondary)" }}>{value}</span>
    </div>
  );
}

function BudgetRow({ label, amount, color, desc }: { label: string; amount: number; color: string; desc: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)" }}>
      <div>
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{label}</div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{desc}</div>
      </div>
      <span className="text-base font-bold font-mono" style={{ color }}>${amount}</span>
    </div>
  );
}

function RoutingRow({ usage, model, source }: { usage: string; model: string; source: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span style={{ color: "var(--text-secondary)" }}>{usage}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>{model}</span>
        <span style={{ color: "var(--text-muted)" }}>({source})</span>
      </div>
    </div>
  );
}

function ChannelIcon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    telegram: "📱",
    discord: "🎮",
    whatsapp: "💬",
    signal: "🔒",
    slack: "💼",
    "device-pair": "📲",
    irc: "🖥️",
  };
  return <span style={{ fontSize: "16px" }}>{icons[name] || "🔌"}</span>;
}
