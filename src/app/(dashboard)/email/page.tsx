"use client";

import { useEffect, useState, useCallback } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  Mail, Inbox, Star, Shield, AlertTriangle, Search, RefreshCw,
  MailOpen, Paperclip, ArrowLeft, Loader2, AlertCircle, Bell,
  DollarSign, CreditCard, Globe, Rocket, Users, Coins,
  Building2, Newspaper, VolumeX, CheckCircle2, Clock,
  Tag, Eye, ChevronDown, ChevronRight, X, Heart,
  TrendingUp, TrendingDown, Banknote, Trash2, ExternalLink,
} from "lucide-react";

// ---- Types ----
interface EmailMsg {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  starred: boolean;
  hasAttachment: boolean;
  account: string;
  accountLabel: string;
  category: string;
  priority: string;
  actionRequired: string | null;
}

interface ActionItem {
  action: string;
  email: string;
  account: string;
  date: string;
  priority: string;
}

interface ThreadGroup {
  sender: string;
  senderName: string;
  count: number;
  latestDate: string;
  categories: string[];
  accounts: string[];
  emails: EmailMsg[];
  isGrouped: boolean;
}

interface AccountHealth {
  email: string;
  label: string;
  status: string;
  count: number;
  totalEmails: number;
  importantCount: number;
  noiseCount: number;
  unreadCount: number;
  noiseRatio: number;
  lastImportantEmail: string | null;
  health: string;
}

interface AutoLabel {
  type: string;
  icon: string;
  label: string;
  details: string[];
}

interface UnsubSuggestion {
  from: string;
  email: string;
  count: number;
  category: string;
  suggestion: string;
}

interface ApiResponse {
  accounts: { email: string; label: string; status: string; count: number }[];
  totalAccounts: number;
  connectedAccounts: number;
  emails: EmailMsg[];
  totalEmails: number;
  unreadCount: number;
  starredCount: number;
  actionItems: ActionItem[];
  categoryCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  threads: ThreadGroup[];
  unsubscribeSuggestions: UnsubSuggestion[];
  accountHealth: AccountHealth[];
  autoLabels: AutoLabel[];
  handledActions: string[];
  errors: string[];
  fetchedAt: string;
}

// ---- Config ----
const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  revenue: { icon: <DollarSign className="w-3.5 h-3.5" />, color: "#a6e3a1", label: "Revenue" },
  billing: { icon: <CreditCard className="w-3.5 h-3.5" />, color: "#f9e2af", label: "Billing" },
  security: { icon: <Shield className="w-3.5 h-3.5" />, color: "#f38ba8", label: "Security" },
  client: { icon: <Users className="w-3.5 h-3.5" />, color: "#89b4fa", label: "Client" },
  domain: { icon: <Globe className="w-3.5 h-3.5" />, color: "#cba6f7", label: "Domain" },
  deploy: { icon: <Rocket className="w-3.5 h-3.5" />, color: "#94e2d5", label: "Deploy" },
  crypto: { icon: <Coins className="w-3.5 h-3.5" />, color: "#fab387", label: "Crypto" },
  banking: { icon: <Building2 className="w-3.5 h-3.5" />, color: "#89dceb", label: "Banking" },
  social: { icon: <Users className="w-3.5 h-3.5" />, color: "#f5c2e7", label: "Social" },
  newsletter: { icon: <Newspaper className="w-3.5 h-3.5" />, color: "#a6adc8", label: "Newsletter" },
  noise: { icon: <VolumeX className="w-3.5 h-3.5" />, color: "#585b70", label: "Noise" },
};

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: "#f38ba8", bg: "rgba(243,139,168,0.15)", label: "🔴 Critical" },
  high: { color: "#fab387", bg: "rgba(250,179,135,0.15)", label: "🟠 High" },
  normal: { color: "#89b4fa", bg: "rgba(137,180,250,0.1)", label: "🔵 Normal" },
  low: { color: "#585b70", bg: "rgba(88,91,112,0.1)", label: "⚪ Low" },
};

const ACCOUNT_COLORS = ["#89b4fa", "#a6e3a1", "#fab387", "#f38ba8", "#cba6f7", "#94e2d5", "#f9e2af", "#89dceb", "#f5c2e7"];

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

// ---- Collapsible Section ----
function Section({ title, icon, badge, defaultOpen, children }: {
  title: string; icon: React.ReactNode; badge?: string | number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-3 text-left">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</span>
          {badge !== undefined && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} /> : <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />}
      </button>
      {open && <div style={{ borderTop: "1px solid var(--border)" }}>{children}</div>}
    </div>
  );
}

// ---- Main Page ----
export default function EmailPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<EmailMsg | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "important" | string>("important");
  const [accountFilter, setAccountFilter] = useState<"all" | string>("all");
  const [viewMode, setViewMode] = useState<"emails" | "threads">("emails");
  const [handledSet, setHandledSet] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"inbox" | "health" | "insights">("inbox");

  const fetchEmails = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/email?limit=20${refresh ? "&refresh=true" : ""}`);
      const json = await res.json();
      setData(json);
      setHandledSet(new Set(json.handledActions || []));
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);
  useEffect(() => { const i = setInterval(() => fetchEmails(true), 120_000); return () => clearInterval(i); }, [fetchEmails]);

  const handleMarkHandled = async (emailId: string) => {
    try {
      await fetch("/api/email/handle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ emailId }) });
      setHandledSet((prev) => new Set([...prev, emailId]));
    } catch {}
  };

  const emails = data?.emails || [];
  const threads = data?.threads || [];
  const accountHealth = data?.accountHealth || [];
  const autoLabels = data?.autoLabels || [];
  const unsubSuggestions = data?.unsubscribeSuggestions || [];

  const importantCategories = new Set(["revenue", "billing", "security", "client", "domain", "banking", "crypto", "deploy"]);

  const filtered = emails
    .filter(e => categoryFilter === "all" ? true : categoryFilter === "important" ? importantCategories.has(e.category) : e.category === categoryFilter)
    .filter(e => accountFilter === "all" || e.account === accountFilter)
    .filter(e => !search || e.subject.toLowerCase().includes(search.toLowerCase()) || e.from.toLowerCase().includes(search.toLowerCase()));

  const importantCount = emails.filter(e => importantCategories.has(e.category)).length;
  const noiseCount = emails.length - importantCount;
  const criticalCount = data?.priorityCounts?.critical || 0;
  const highCount = data?.priorityCounts?.high || 0;
  const actionItems = (data?.actionItems || []).filter((a) => !handledSet.has(a.email));

  const accountColorMap: Record<string, string> = {};
  (data?.accounts || []).forEach((acc, i) => { accountColorMap[acc.email] = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]; });

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Scanning 9 inboxes...</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Categorizing, threading & extracting insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <Mail className="w-6 h-6" style={{ color: "var(--accent)" }} /> Email Command Center
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {data?.connectedAccounts || 0} accounts · {importantCount} important · {noiseCount} noise
            {data?.fetchedAt && <span style={{ color: "var(--text-muted)" }}> · {timeAgo(data.fetchedAt)}</span>}
          </p>
        </div>
        <button onClick={() => fetchEmails(true)} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", opacity: refreshing ? 0.6 : 1 }}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Scanning..." : "Refresh"}
        </button>
      </div>

      {/* Errors */}
      {data?.errors && data.errors.length > 0 && (
        <div className="rounded-xl p-3 flex items-start gap-2" style={{ backgroundColor: "rgba(243,139,168,0.1)", border: "1px solid rgba(243,139,168,0.3)" }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#f38ba8" }} />
          <div className="text-xs" style={{ color: "#f38ba8" }}>{data.errors.map((e, i) => <p key={i}>{e}</p>)}</div>
        </div>
      )}

      {/* Auto Labels (Financial Summary) */}
      {autoLabels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {autoLabels.map((label, i) => (
            <div key={i} className="rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{label.icon}</span>
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label.label}</span>
              </div>
              <div className="space-y-1">
                {label.details.slice(0, 3).map((d, j) => (
                  <p key={j} className="text-xs" style={{ color: "var(--text-secondary)" }}>{d}</p>
                ))}
                {label.details.length > 3 && (
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>+{label.details.length - 3} more</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Items */}
      {actionItems.length > 0 && (
        <Section title="Action Required" icon={<Bell className="w-4 h-4" style={{ color: "#f38ba8" }} />} badge={actionItems.length} defaultOpen={true}>
          <div className="p-3 space-y-2">
            {actionItems.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ backgroundColor: PRIORITY_CONFIG[item.priority]?.bg || "var(--surface-elevated)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0" style={{
                    backgroundColor: `${PRIORITY_CONFIG[item.priority]?.color || "#89b4fa"}20`,
                    color: PRIORITY_CONFIG[item.priority]?.color || "#89b4fa",
                  }}>{item.priority.toUpperCase()}</span>
                  <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{item.action}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)" }}>{item.account}</span>
                  <button onClick={() => handleMarkHandled(item.email)} title="Mark as handled"
                    className="p-1 rounded hover:bg-green-900/20 transition-colors">
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#a6e3a1" }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard title="Critical" value={criticalCount} icon={<AlertTriangle />}
          iconColor={criticalCount > 0 ? "#f38ba8" : "var(--text-muted)"}
          subtitle={criticalCount > 0 ? "Needs attention" : "All clear"} />
        <StatsCard title="High Priority" value={highCount} icon={<Bell />}
          iconColor={highCount > 0 ? "#fab387" : "var(--text-muted)"} subtitle="Revenue, banking, clients" />
        <StatsCard title="Important" value={importantCount} icon={<Inbox />}
          iconColor="#89b4fa" subtitle={`of ${emails.length} total`} />
        <StatsCard title="Noise Filtered" value={noiseCount} icon={<VolumeX />}
          iconColor="#585b70" subtitle="Auto-hidden" />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "var(--surface-elevated)" }}>
        {([["inbox", "📥 Inbox"], ["health", "❤️ Account Health"], ["insights", "💡 Insights"]] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-center"
            style={{
              backgroundColor: activeTab === tab ? "var(--accent)" : "transparent",
              color: activeTab === tab ? "var(--bg)" : "var(--text-muted)",
            }}>{label}</button>
        ))}
      </div>

      {/* ===== INBOX TAB ===== */}
      {activeTab === "inbox" && (
        <>
          {/* Category + View Mode + Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setCategoryFilter("important")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: categoryFilter === "important" ? "var(--accent)" : "var(--surface-elevated)", color: categoryFilter === "important" ? "var(--bg)" : "var(--text-secondary)", border: `1px solid ${categoryFilter === "important" ? "var(--accent)" : "var(--border)"}` }}>
              <Star className="w-3 h-3" /> Important ({importantCount})
            </button>
            <button onClick={() => setCategoryFilter("all")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ backgroundColor: categoryFilter === "all" ? "var(--accent)" : "var(--surface-elevated)", color: categoryFilter === "all" ? "var(--bg)" : "var(--text-secondary)", border: `1px solid ${categoryFilter === "all" ? "var(--accent)" : "var(--border)"}` }}>
              <Mail className="w-3 h-3" /> All ({emails.length})
            </button>
            {Object.entries(data?.categoryCounts || {}).sort(([, a], [, b]) => b - a).filter(([c]) => c !== "noise").map(([cat, count]) => {
              const cfg = CATEGORY_CONFIG[cat];
              if (!cfg) return null;
              return (
                <button key={cat} onClick={() => setCategoryFilter(categoryFilter === cat ? "important" : cat)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]"
                  style={{ backgroundColor: categoryFilter === cat ? `${cfg.color}20` : "var(--surface-elevated)", color: categoryFilter === cat ? cfg.color : "var(--text-muted)", border: `1px solid ${categoryFilter === cat ? cfg.color : "var(--border)"}` }}>
                  {cfg.icon} {cfg.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Search + Account + View toggle */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all emails..."
                className="w-full text-sm rounded-lg pl-9 pr-3 py-2" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </div>
            <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)}
              className="text-xs rounded-lg px-2 py-2" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              <option value="all">All Accounts</option>
              {(data?.accounts || []).map(acc => <option key={acc.email} value={acc.email}>{acc.label} ({acc.count})</option>)}
            </select>
            <div className="flex gap-1 p-0.5 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)" }}>
              <button onClick={() => setViewMode("emails")} className="px-2 py-1 rounded text-[10px]"
                style={{ backgroundColor: viewMode === "emails" ? "var(--accent)" : "transparent", color: viewMode === "emails" ? "var(--bg)" : "var(--text-muted)" }}>Emails</button>
              <button onClick={() => setViewMode("threads")} className="px-2 py-1 rounded text-[10px]"
                style={{ backgroundColor: viewMode === "threads" ? "var(--accent)" : "transparent", color: viewMode === "threads" ? "var(--bg)" : "var(--text-muted)" }}>Threads</button>
            </div>
          </div>

          {/* Email List + Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: "50vh" }}>
            <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 520px)" }}>
                {viewMode === "emails" ? (
                  filtered.length === 0 ? (
                    <div className="text-center py-12">
                      <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#a6e3a1" }} />
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                        {categoryFilter === "important" ? "No important emails! 🎉" : "No emails match"}
                      </p>
                    </div>
                  ) : filtered.map(email => {
                    const catCfg = CATEGORY_CONFIG[email.category] || CATEGORY_CONFIG.noise;
                    const priCfg = PRIORITY_CONFIG[email.priority] || PRIORITY_CONFIG.normal;
                    const acctColor = accountColorMap[email.account] || "var(--accent)";
                    const isHandled = handledSet.has(email.id);
                    return (
                      <button key={email.id} onClick={() => setSelected(email)}
                        className="w-full text-left p-3 transition-colors flex gap-3"
                        style={{
                          backgroundColor: selected?.id === email.id ? "var(--accent-soft)" : email.priority === "critical" ? "rgba(243,139,168,0.05)" : "transparent",
                          borderBottom: "1px solid var(--border)",
                          borderLeft: `3px solid ${priCfg.color}`,
                          opacity: isHandled ? 0.5 : 1,
                        }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${catCfg.color}15`, color: catCfg.color }}>{catCfg.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm truncate ${!email.read ? "font-semibold" : ""}`} style={{ color: "var(--text-primary)" }}>{email.from}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {email.hasAttachment && <Paperclip className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(email.date)}</span>
                            </div>
                          </div>
                          <div className={`text-xs truncate mt-0.5 ${!email.read ? "font-medium" : ""}`} style={{ color: !email.read ? "var(--text-primary)" : "var(--text-secondary)" }}>{email.subject}</div>
                          {email.actionRequired && !isHandled && (
                            <div className="text-[10px] mt-1 truncate flex items-center gap-1" style={{ color: priCfg.color }}>
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> {email.actionRequired}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${catCfg.color}15`, color: catCfg.color }}>{catCfg.label}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${acctColor}15`, color: acctColor }}>{email.accountLabel}</span>
                            {isHandled && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "rgba(166,227,161,0.15)", color: "#a6e3a1" }}>✅ Handled</span>}
                          </div>
                        </div>
                        {!email.read && <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: priCfg.color }} />}
                      </button>
                    );
                  })
                ) : (
                  /* Thread View */
                  threads.filter(t => t.count > 1).length === 0 ? (
                    <div className="text-center py-12">
                      <Mail className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                      <p className="text-sm" style={{ color: "var(--text-muted)" }}>No grouped threads</p>
                    </div>
                  ) : threads.filter(t => t.count > 1).sort((a, b) => b.count - a.count).map((thread, i) => {
                    const catCfg = CATEGORY_CONFIG[thread.categories[0]] || CATEGORY_CONFIG.noise;
                    return (
                      <button key={i} onClick={() => setSelected(thread.emails[0])}
                        className="w-full text-left p-3 transition-colors" style={{ borderBottom: "1px solid var(--border)" }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${catCfg.color}15`, color: catCfg.color }}>{catCfg.icon}</div>
                            <div>
                              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{thread.senderName}</span>
                              <span className="text-[10px] ml-2 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>{thread.count}</span>
                            </div>
                          </div>
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(thread.latestDate)}</span>
                        </div>
                        <div className="flex gap-1 mt-1.5 ml-10">
                          {thread.categories.map(c => {
                            const cfg = CATEGORY_CONFIG[c];
                            return cfg ? <span key={c} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>{cfg.label}</span> : null;
                          })}
                          {thread.accounts.map(a => <span key={a} className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)" }}>{a}</span>)}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Email Preview */}
            <div className="lg:col-span-3 rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              {selected ? (
                <div className="h-full flex flex-col">
                  <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setSelected(null)} className="lg:hidden flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
                        <ArrowLeft className="w-3 h-3" /> Back
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ backgroundColor: PRIORITY_CONFIG[selected.priority]?.bg, color: PRIORITY_CONFIG[selected.priority]?.color }}>{PRIORITY_CONFIG[selected.priority]?.label}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: `${CATEGORY_CONFIG[selected.category]?.color || "#89b4fa"}15`, color: CATEGORY_CONFIG[selected.category]?.color || "#89b4fa" }}>
                          {CATEGORY_CONFIG[selected.category]?.icon} {CATEGORY_CONFIG[selected.category]?.label}
                        </span>
                        {selected.actionRequired && !handledSet.has(selected.id) && (
                          <button onClick={() => handleMarkHandled(selected.id)}
                            className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition-colors hover:opacity-80"
                            style={{ backgroundColor: "rgba(166,227,161,0.15)", color: "#a6e3a1" }}>
                            <CheckCircle2 className="w-3 h-3" /> Mark Handled
                          </button>
                        )}
                      </div>
                    </div>

                    {selected.actionRequired && !handledSet.has(selected.id) && (
                      <div className="rounded-lg px-3 py-2 mb-3 flex items-center gap-2" style={{ backgroundColor: PRIORITY_CONFIG[selected.priority]?.bg, border: `1px solid ${PRIORITY_CONFIG[selected.priority]?.color}40` }}>
                        <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: PRIORITY_CONFIG[selected.priority]?.color }} />
                        <span className="text-sm font-medium" style={{ color: PRIORITY_CONFIG[selected.priority]?.color }}>{selected.actionRequired}</span>
                      </div>
                    )}

                    <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{selected.subject}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: `${accountColorMap[selected.account] || "var(--accent)"}20`, color: accountColorMap[selected.account] || "var(--accent)" }}>
                        {selected.from[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{selected.from}</div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {selected.fromEmail} → {selected.accountLabel} · {new Date(selected.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-6 overflow-y-auto">
                    <pre className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                      {selected.preview || "(No content available)"}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center" style={{ minHeight: "400px" }}>
                  <div className="text-center">
                    <Mail className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Select an email to read</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ===== HEALTH TAB ===== */}
      {activeTab === "health" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {accountHealth.map((acc, i) => {
              const color = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length];
              const healthIcon = acc.health === "noisy" ? "🔴" : acc.health === "healthy" ? "🟢" : "⚪";
              return (
                <div key={acc.email} className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.status === "connected" ? "#a6e3a1" : "#f38ba8" }} />
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{acc.label}</span>
                    </div>
                    <span className="text-lg">{healthIcon}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "var(--surface-elevated)" }}>
                      <p className="text-lg font-bold" style={{ color }}>{acc.importantCount}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Important</p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ backgroundColor: "var(--surface-elevated)" }}>
                      <p className="text-lg font-bold" style={{ color: "#585b70" }}>{acc.noiseCount}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Noise</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "var(--text-muted)" }}>Noise ratio</span>
                      <span style={{ color: acc.noiseRatio > 70 ? "#f38ba8" : acc.noiseRatio > 40 ? "#f9e2af" : "#a6e3a1" }}>{acc.noiseRatio}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ backgroundColor: "var(--surface-elevated)" }}>
                      <div className="h-full rounded-full" style={{ width: `${acc.noiseRatio}%`, backgroundColor: acc.noiseRatio > 70 ? "#f38ba8" : acc.noiseRatio > 40 ? "#f9e2af" : "#a6e3a1" }} />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span style={{ color: "var(--text-muted)" }}>Unread</span>
                      <span style={{ color: "var(--text-secondary)" }}>{acc.unreadCount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "var(--text-muted)" }}>Last important</span>
                      <span style={{ color: "var(--text-secondary)" }}>{acc.lastImportantEmail ? timeAgo(acc.lastImportantEmail) : "—"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== INSIGHTS TAB ===== */}
      {activeTab === "insights" && (
        <div className="space-y-4">
          {/* Unsubscribe Suggestions */}
          {unsubSuggestions.length > 0 && (
            <Section title="Unsubscribe Suggestions" icon={<Trash2 className="w-4 h-4" style={{ color: "#f38ba8" }} />} badge={unsubSuggestions.length} defaultOpen={true}>
              <div className="p-3 space-y-2">
                <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
                  These senders send mostly noise. Unsubscribing could reduce clutter significantly.
                </p>
                {unsubSuggestions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: "var(--surface-elevated)" }}>
                    <div>
                      <p className="text-sm" style={{ color: "var(--text-primary)" }}>{s.from}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "rgba(243,139,168,0.15)", color: "#f38ba8" }}>{s.count} noise emails</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Category Breakdown */}
          <Section title="Category Breakdown" icon={<Tag className="w-4 h-4" style={{ color: "var(--accent)" }} />} defaultOpen={true}>
            <div className="p-3 space-y-2">
              {Object.entries(data?.categoryCounts || {}).sort(([, a], [, b]) => b - a).map(([cat, count]) => {
                const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.noise;
                const pct = Math.round((count / emails.length) * 100);
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-24 shrink-0">
                      <span style={{ color: cfg.color }}>{cfg.icon}</span>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{cfg.label}</span>
                    </div>
                    <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "var(--surface-elevated)" }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cfg.color, minWidth: pct > 0 ? "4px" : "0" }} />
                    </div>
                    <span className="text-xs w-12 text-right" style={{ color: "var(--text-muted)" }}>{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* Thread Summary */}
          <Section title="Top Senders" icon={<Users className="w-4 h-4" style={{ color: "#cba6f7" }} />} defaultOpen={false}>
            <div className="p-3 space-y-2">
              {threads.sort((a, b) => b.count - a.count).slice(0, 10).map((t, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <span style={{ color: "var(--text-primary)" }}>{t.senderName}</span>
                  <div className="flex items-center gap-2">
                    {t.categories.map(c => {
                      const cfg = CATEGORY_CONFIG[c];
                      return cfg ? <span key={c} className="text-[9px] px-1 py-0.5 rounded" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>{cfg.label}</span> : null;
                    })}
                    <span className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>{t.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
