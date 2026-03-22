"use client";

import { useEffect, useState, useCallback } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  Mail, Inbox, Star, Shield, AlertTriangle, Search, RefreshCw,
  MailOpen, Paperclip, ArrowLeft, Loader2, AlertCircle, Bell,
  DollarSign, CreditCard, Globe, Rocket, Users, Coins,
  Building2, Newspaper, VolumeX, ChevronRight, Clock, CheckCircle2,
  Filter, Tag,
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
  errors: string[];
  fetchedAt: string;
}

// ---- Category Config ----
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

const ACCOUNT_COLORS = [
  "#89b4fa", "#a6e3a1", "#fab387", "#f38ba8", "#cba6f7",
  "#94e2d5", "#f9e2af", "#89dceb", "#f5c2e7",
];

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
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

  const fetchEmails = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/email?limit=20${refresh ? "&refresh=true" : ""}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch emails:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchEmails(); }, [fetchEmails]);
  useEffect(() => {
    const interval = setInterval(() => fetchEmails(true), 120_000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const emails = data?.emails || [];
  const actionItems = data?.actionItems || [];
  const accounts = data?.accounts || [];

  // Important = not noise, not newsletter, not social
  const importantCategories = new Set(["revenue", "billing", "security", "client", "domain", "banking", "crypto", "deploy"]);

  const filtered = emails
    .filter(e => {
      if (categoryFilter === "all") return true;
      if (categoryFilter === "important") return importantCategories.has(e.category);
      return e.category === categoryFilter;
    })
    .filter(e => accountFilter === "all" || e.account === accountFilter)
    .filter(e => !search || e.subject.toLowerCase().includes(search.toLowerCase()) || e.from.toLowerCase().includes(search.toLowerCase()));

  const criticalCount = data?.priorityCounts?.critical || 0;
  const highCount = data?.priorityCounts?.high || 0;
  const importantCount = emails.filter(e => importantCategories.has(e.category)).length;
  const noiseCount = emails.filter(e => !importantCategories.has(e.category)).length;

  const accountColorMap: Record<string, string> = {};
  accounts.forEach((acc, i) => { accountColorMap[acc.email] = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]; });

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Scanning {accounts.length || 9} inboxes...</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Categorizing & extracting action items</p>
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
            {data?.connectedAccounts || 0} accounts · {importantCount} important · {noiseCount} filtered out
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

      {/* === ACTION ITEMS BANNER === */}
      {actionItems.length > 0 && (
        <div className="rounded-xl p-4" style={{ backgroundColor: "rgba(243,139,168,0.08)", border: "1px solid rgba(243,139,168,0.2)" }}>
          <h2 className="text-sm font-semibold flex items-center gap-2 mb-3" style={{ color: "#f38ba8" }}>
            <Bell className="w-4 h-4" /> Action Required ({actionItems.length})
          </h2>
          <div className="space-y-2">
            {actionItems.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ backgroundColor: PRIORITY_CONFIG[item.priority]?.bg || "var(--surface-elevated)" }}>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded" style={{
                    backgroundColor: `${PRIORITY_CONFIG[item.priority]?.color || "#89b4fa"}20`,
                    color: PRIORITY_CONFIG[item.priority]?.color || "#89b4fa",
                  }}>
                    {item.priority.toUpperCase()}
                  </span>
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{item.action}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)" }}>
                    {item.account}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(item.date)}</span>
                </div>
              </div>
            ))}
            {actionItems.length > 5 && (
              <p className="text-xs text-center pt-1" style={{ color: "var(--text-muted)" }}>
                +{actionItems.length - 5} more action items
              </p>
            )}
          </div>
        </div>
      )}

      {/* === STATS ROW === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard title="Critical" value={criticalCount} icon={<AlertTriangle />}
          iconColor={criticalCount > 0 ? "#f38ba8" : "var(--text-muted)"}
          subtitle={criticalCount > 0 ? "Needs immediate attention" : "All clear"} />
        <StatsCard title="High Priority" value={highCount} icon={<Bell />}
          iconColor={highCount > 0 ? "#fab387" : "var(--text-muted)"}
          subtitle="Revenue, banking, clients" />
        <StatsCard title="Important" value={importantCount} icon={<Inbox />}
          iconColor="#89b4fa" subtitle={`of ${emails.length} total`} />
        <StatsCard title="Noise Filtered" value={noiseCount} icon={<VolumeX />}
          iconColor="#585b70" subtitle="Newsletters, social, spam" />
      </div>

      {/* === CATEGORY BREAKDOWN === */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setCategoryFilter("important")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: categoryFilter === "important" ? "var(--accent)" : "var(--surface-elevated)",
            color: categoryFilter === "important" ? "var(--bg)" : "var(--text-secondary)",
            border: `1px solid ${categoryFilter === "important" ? "var(--accent)" : "var(--border)"}`,
          }}>
          <Star className="w-3 h-3" /> Important ({importantCount})
        </button>
        <button onClick={() => setCategoryFilter("all")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{
            backgroundColor: categoryFilter === "all" ? "var(--accent)" : "var(--surface-elevated)",
            color: categoryFilter === "all" ? "var(--bg)" : "var(--text-secondary)",
            border: `1px solid ${categoryFilter === "all" ? "var(--accent)" : "var(--border)"}`,
          }}>
          <Mail className="w-3 h-3" /> All ({emails.length})
        </button>
        {Object.entries(data?.categoryCounts || {})
          .sort(([, a], [, b]) => b - a)
          .filter(([cat]) => cat !== "noise")
          .map(([cat, count]) => {
            const cfg = CATEGORY_CONFIG[cat] || { icon: <Mail className="w-3.5 h-3.5" />, color: "#89b4fa", label: cat };
            const isActive = categoryFilter === cat;
            return (
              <button key={cat} onClick={() => setCategoryFilter(isActive ? "important" : cat)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
                style={{
                  backgroundColor: isActive ? `${cfg.color}20` : "var(--surface-elevated)",
                  color: isActive ? cfg.color : "var(--text-muted)",
                  border: `1px solid ${isActive ? cfg.color : "var(--border)"}`,
                }}>
                {cfg.icon} {cfg.label} ({count})
              </button>
            );
          })}
      </div>

      {/* === ACCOUNT FILTER + SEARCH === */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search emails..."
            className="w-full text-sm rounded-lg pl-9 pr-3 py-2" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
        </div>
        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)}
          className="text-xs rounded-lg px-2 py-2" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          <option value="all">All Accounts ({data?.connectedAccounts || 0})</option>
          {accounts.map(acc => (
            <option key={acc.email} value={acc.email}>{acc.label} ({acc.count})</option>
          ))}
        </select>
      </div>

      {/* === EMAIL LIST + PREVIEW === */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: "55vh" }}>
        {/* Email List */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 480px)" }}>
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3" style={{ color: "#a6e3a1" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {categoryFilter === "important" ? "No important emails right now! 🎉" : "No emails match filters"}
                </p>
              </div>
            ) : (
              filtered.map(email => {
                const catCfg = CATEGORY_CONFIG[email.category] || CATEGORY_CONFIG.noise;
                const priCfg = PRIORITY_CONFIG[email.priority] || PRIORITY_CONFIG.normal;
                const acctColor = accountColorMap[email.account] || "var(--accent)";
                return (
                  <button key={email.id} onClick={() => setSelected(email)}
                    className="w-full text-left p-3 transition-colors flex gap-3"
                    style={{
                      backgroundColor: selected?.id === email.id ? "var(--accent-soft)" : email.priority === "critical" ? "rgba(243,139,168,0.05)" : "transparent",
                      borderBottom: "1px solid var(--border)",
                      borderLeft: `3px solid ${priCfg.color}`,
                    }}>
                    {/* Category Icon */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${catCfg.color}15`, color: catCfg.color }}>
                      {catCfg.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${!email.read ? "font-semibold" : ""}`} style={{ color: "var(--text-primary)" }}>
                          {email.from}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {email.hasAttachment && <Paperclip className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(email.date)}</span>
                        </div>
                      </div>
                      <div className={`text-xs truncate mt-0.5 ${!email.read ? "font-medium" : ""}`}
                        style={{ color: !email.read ? "var(--text-primary)" : "var(--text-secondary)" }}>
                        {email.subject}
                      </div>
                      {/* Action Required indicator */}
                      {email.actionRequired && (
                        <div className="text-[10px] mt-1 truncate flex items-center gap-1" style={{ color: priCfg.color }}>
                          <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> {email.actionRequired}
                        </div>
                      )}
                      {/* Tags row */}
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded flex items-center gap-0.5"
                          style={{ backgroundColor: `${catCfg.color}15`, color: catCfg.color }}>
                          {catCfg.label}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${acctColor}15`, color: acctColor }}>
                          {email.accountLabel}
                        </span>
                      </div>
                    </div>

                    {!email.read && <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: priCfg.color }} />}
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
                    {/* Priority badge */}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{ backgroundColor: PRIORITY_CONFIG[selected.priority]?.bg, color: PRIORITY_CONFIG[selected.priority]?.color }}>
                      {PRIORITY_CONFIG[selected.priority]?.label}
                    </span>
                    {/* Category badge */}
                    <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                      style={{ backgroundColor: `${CATEGORY_CONFIG[selected.category]?.color || "#89b4fa"}15`, color: CATEGORY_CONFIG[selected.category]?.color || "#89b4fa" }}>
                      {CATEGORY_CONFIG[selected.category]?.icon} {CATEGORY_CONFIG[selected.category]?.label}
                    </span>
                  </div>
                </div>

                {/* Action required banner */}
                {selected.actionRequired && (
                  <div className="rounded-lg px-3 py-2 mb-3 flex items-center gap-2"
                    style={{ backgroundColor: PRIORITY_CONFIG[selected.priority]?.bg, border: `1px solid ${PRIORITY_CONFIG[selected.priority]?.color}40` }}>
                    <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: PRIORITY_CONFIG[selected.priority]?.color }} />
                    <span className="text-sm font-medium" style={{ color: PRIORITY_CONFIG[selected.priority]?.color }}>
                      {selected.actionRequired}
                    </span>
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
                  {selected.preview || "(No preview available)"}
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center" style={{ minHeight: "400px" }}>
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Select an email to preview</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  Showing {categoryFilter === "important" ? "important" : categoryFilter === "all" ? "all" : categoryFilter} emails
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
