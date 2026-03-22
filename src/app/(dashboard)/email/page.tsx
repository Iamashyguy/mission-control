"use client";

import { useEffect, useState, useCallback } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  Mail, Inbox, Star, Archive, Settings, Search,
  Paperclip, RefreshCw, MailOpen, Tag, Trash2, ArrowLeft, Loader2, AlertCircle,
} from "lucide-react";

// ---- Types ----
interface EmailMsg {
  id: string;
  uid: number;
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
}

interface AccountStatus {
  email: string;
  label: string;
  status: string;
  count: number;
}

interface ApiResponse {
  accounts: AccountStatus[];
  totalAccounts: number;
  connectedAccounts: number;
  setupRequired: boolean;
  emails: EmailMsg[];
  totalEmails: number;
  unreadCount: number;
  starredCount: number;
  errors: string[];
  fetchedAt: string;
}

const LABEL_COLORS: Record<string, string> = {
  revenue: "#a6e3a1",
  important: "#f38ba8",
  github: "#cba6f7",
  billing: "#f9e2af",
  finance: "#89b4fa",
  deploy: "#94e2d5",
  analytics: "#fab387",
  security: "#f38ba8",
  domains: "#f9e2af",
};

// Assign colors to accounts
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

function getInitials(name: string): string {
  return name.split(/[\s@]/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

// ---- Main Page ----
export default function EmailPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<EmailMsg | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "starred">("all");
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

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => fetchEmails(true), 120_000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const emails = data?.emails || [];
  const accounts = data?.accounts || [];

  const filtered = emails
    .filter(e => filter === "all" || (filter === "unread" && !e.read) || (filter === "starred" && e.starred))
    .filter(e => accountFilter === "all" || e.account === accountFilter)
    .filter(e => !search || e.subject.toLowerCase().includes(search.toLowerCase()) || e.from.toLowerCase().includes(search.toLowerCase()) || e.fromEmail.toLowerCase().includes(search.toLowerCase()));

  const unreadCount = data?.unreadCount || emails.filter(e => !e.read).length;
  const starredCount = data?.starredCount || emails.filter(e => e.starred).length;

  // Get account color
  const accountColorMap: Record<string, string> = {};
  accounts.forEach((acc, i) => {
    accountColorMap[acc.email] = ACCOUNT_COLORS[i % ACCOUNT_COLORS.length];
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "60vh" }}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: "var(--accent)" }} />
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Connecting to {accounts.length || 9} email accounts...</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>First load may take 15-30 seconds</p>
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
            <Mail className="w-6 h-6" style={{ color: "var(--accent)" }} /> Email Hub
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {emails.length} emails · {unreadCount} unread · {accounts.length} accounts
            {data?.fetchedAt && (
              <span style={{ color: "var(--text-muted)" }}> · Updated {timeAgo(data.fetchedAt)}</span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchEmails(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
          style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", opacity: refreshing ? 0.6 : 1 }}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Errors */}
      {data?.errors && data.errors.length > 0 && (
        <div className="rounded-xl p-3 flex items-start gap-2" style={{ backgroundColor: "rgba(243, 139, 168, 0.1)", border: "1px solid rgba(243, 139, 168, 0.3)" }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#f38ba8" }} />
          <div className="text-xs" style={{ color: "#f38ba8" }}>
            {data.errors.map((e, i) => <p key={i}>{e}</p>)}
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard title="Total" value={emails.length} icon={<Mail />} iconColor="var(--accent)" subtitle={`From ${accounts.length} accounts`} />
        <StatsCard title="Unread" value={unreadCount} icon={<Inbox />} iconColor={unreadCount > 0 ? "#89b4fa" : "var(--text-muted)"} subtitle={unreadCount > 0 ? "Needs attention" : "All caught up"} />
        <StatsCard title="Starred" value={starredCount} icon={<Star />} iconColor="#f9e2af" subtitle="Flagged" />
        <StatsCard title="Accounts" value={data?.connectedAccounts || 0} icon={<Settings />} iconColor="var(--accent)" subtitle={`${data?.connectedAccounts || 0}/${data?.totalAccounts || 0} connected`} />
      </div>

      {/* Account Pills */}
      <div className="flex gap-2 flex-wrap">
        {accounts.map((acc, i) => (
          <button
            key={acc.email}
            onClick={() => setAccountFilter(accountFilter === acc.email ? "all" : acc.email)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{
              backgroundColor: accountFilter === acc.email ? `${ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]}20` : "var(--surface-elevated)",
              border: `1px solid ${accountFilter === acc.email ? ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] : "var(--border)"}`,
              color: accountFilter === acc.email ? ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] : "var(--text-secondary)",
            }}>
            <span className="w-2 h-2 rounded-full" style={{
              backgroundColor: acc.status === "connected" ? "#a6e3a1" : acc.status === "error" ? "#f38ba8" : "#f9e2af"
            }} />
            {acc.label} ({acc.count})
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search emails..."
            className="w-full text-sm rounded-lg pl-9 pr-3 py-2" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
        </div>
        <div className="flex gap-1">
          {(["all", "unread", "starred"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
              style={{ backgroundColor: filter === f ? "var(--accent)" : "var(--surface-elevated)", color: filter === f ? "var(--bg)" : "var(--text-muted)" }}>
              {f} {f === "unread" ? `(${unreadCount})` : f === "starred" ? `(${starredCount})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* Email List + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: "60vh" }}>
        {/* Email List */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 380px)" }}>
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <MailOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {emails.length === 0 ? "No emails fetched yet" : "No emails match your filters"}
                </p>
              </div>
            ) : (
              filtered.map(email => {
                const acctColor = accountColorMap[email.account] || "var(--accent)";
                return (
                  <button key={email.id} onClick={() => setSelected(email)}
                    className="w-full text-left p-3 transition-colors flex gap-3"
                    style={{
                      backgroundColor: selected?.id === email.id ? "var(--accent-soft)" : email.read ? "transparent" : "rgba(137, 180, 250, 0.03)",
                      borderBottom: "1px solid var(--border)",
                      borderLeft: selected?.id === email.id ? `3px solid var(--accent)` : `3px solid ${acctColor}40`,
                    }}>
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: `${acctColor}20`, color: acctColor }}>
                      {getInitials(email.from)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${!email.read ? "font-semibold" : ""}`} style={{ color: "var(--text-primary)" }}>
                          {email.from}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {email.starred && <Star className="w-3 h-3" style={{ color: "#f9e2af", fill: "#f9e2af" }} />}
                          {email.hasAttachment && <Paperclip className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(email.date)}</span>
                        </div>
                      </div>
                      <div className={`text-xs truncate mt-0.5 ${!email.read ? "font-medium" : ""}`} style={{ color: !email.read ? "var(--text-primary)" : "var(--text-secondary)" }}>
                        {email.subject}
                      </div>
                      <div className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {email.preview.slice(0, 80)}{email.preview.length > 80 ? "..." : ""}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${acctColor}15`, color: acctColor }}>
                          {email.accountLabel}
                        </span>
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!email.read && <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: "#89b4fa" }} />}
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
              {/* Preview Header */}
              <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-2">
                  <button onClick={() => setSelected(null)} className="lg:hidden flex items-center gap-1 text-xs" style={{ color: "var(--accent)" }}>
                    <ArrowLeft className="w-3 h-3" /> Back
                  </button>
                </div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{selected.subject}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: `${accountColorMap[selected.account] || "var(--accent)"}20`, color: accountColorMap[selected.account] || "var(--accent)" }}>
                    {getInitials(selected.from)}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{selected.from}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {selected.fromEmail} · {new Date(selected.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                    style={{ backgroundColor: `${accountColorMap[selected.account] || "var(--accent)"}15`, color: accountColorMap[selected.account] || "var(--accent)" }}>
                    <Tag className="w-2.5 h-2.5" /> {selected.accountLabel}
                  </span>
                  {selected.starred && (
                    <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                      style={{ backgroundColor: "#f9e2af20", color: "#f9e2af" }}>
                      <Star className="w-2.5 h-2.5" /> Starred
                    </span>
                  )}
                  {selected.hasAttachment && (
                    <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                      style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)" }}>
                      <Paperclip className="w-2.5 h-2.5" /> Attachment
                    </span>
                  )}
                </div>
              </div>

              {/* Email Body (preview) */}
              <div className="flex-1 p-6 overflow-y-auto">
                <pre className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  {selected.preview || "(No preview available — email body will show once full-text fetch is enabled)"}
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center" style={{ minHeight: "400px" }}>
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)", opacity: 0.3 }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Select an email to read</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  {unreadCount > 0 ? `You have ${unreadCount} unread messages` : "All caught up! 🎉"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
