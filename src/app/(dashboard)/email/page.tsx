"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  Mail, Inbox, Star, Archive, CheckCircle, AlertTriangle, Settings, Search,
  Clock, Paperclip, ChevronRight, RefreshCw, Filter, MailOpen, Tag, Trash2, ArrowLeft,
} from "lucide-react";

// ---- Types ----
interface EmailMsg {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  important: boolean;
  hasAttachment: boolean;
  labels: string[];
  account: string;
}

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  icon: string;
  status: string;
  purpose: string;
}

// ---- Mock Emails ----
const MOCK_EMAILS: EmailMsg[] = [
  { id: "1", from: "Google AdSense", fromEmail: "adsense-noreply@google.com", subject: "Your March earnings report is ready", preview: "Hi Ashish, your earnings report for March 2026 is now available in your AdSense account...", body: "Hi Ashish,\n\nYour earnings report for March 2026 is now available in your AdSense account. This month you earned $1,247.32 across all your sites.\n\nTop performing sites:\n1. Site #1 - $523.41\n2. Site #2 - $312.18\n3. Site #3 - $198.73\n\nView your full report at https://adsense.google.com\n\nBest regards,\nThe Google AdSense Team", date: "2026-03-22T11:30:00Z", read: false, starred: true, important: true, hasAttachment: false, labels: ["revenue", "important"], account: "openclawashish" },
  { id: "2", from: "GitHub", fromEmail: "notifications@github.com", subject: "[Iamashyguy/mission-control] Phase 4 pushed successfully", preview: "9 new commits pushed to main branch by Iamashyguy...", body: "9 new commits pushed to main branch:\n\n- d4f67f7 Phase 4: Zustand store, Framer Motion, keyboard shortcuts\n- 89bc6fd Phase 3 complete: Calendar, Backup, Standup, Task Board\n- c52f8c9 Phase 3: Security, Notifications, Workflows rebuild\n- 0226ecc Phase 2: 3D Office (React Three Fiber)\n- f898a65 Phase 2: SSE real-time streaming\n\nView on GitHub", date: "2026-03-22T12:15:00Z", read: false, starred: false, important: false, hasAttachment: false, labels: ["github"], account: "openclawashish" },
  { id: "3", from: "Hostinger", fromEmail: "billing@hostinger.com", subject: "Invoice #HG-28471 — VPS KVM2 Monthly", preview: "Your monthly VPS hosting invoice is ready. Amount: $12.99...", body: "Dear Ashish,\n\nYour monthly invoice for VPS KVM2 hosting plan is ready.\n\nInvoice: #HG-28471\nAmount: $12.99\nPeriod: March 2026\nStatus: Auto-paid via card ending 4821\n\nThank you for choosing Hostinger.\n\nBest,\nHostinger Billing Team", date: "2026-03-22T08:00:00Z", read: true, starred: false, important: false, hasAttachment: true, labels: ["billing"], account: "antarjyami" },
  { id: "4", from: "Wise", fromEmail: "no-reply@wise.com", subject: "Money received: £342.50 from client payment", preview: "You received £342.50 GBP in your Wise account from Exlent Studio Ltd...", body: "Hi Ashish,\n\nYou've received a payment:\n\nAmount: £342.50 GBP\nFrom: Exlent Studio Ltd\nTo: Your GBP balance\nReference: Invoice #EX-2026-047\n\nYour new GBP balance: £1,247.83\n\nView in Wise app", date: "2026-03-21T16:45:00Z", read: true, starred: true, important: true, hasAttachment: false, labels: ["finance", "important"], account: "antarjyami" },
  { id: "5", from: "Render", fromEmail: "notifications@render.com", subject: "Deploy successful: discover-bot-api", preview: "Your service discover-bot-api deployed successfully at 2:30 PM IST...", body: "Deploy Successful\n\nService: discover-bot-api\nCommit: abc1234 - Update publishing pipeline\nTime: 2:30 PM IST\nStatus: Live\n\nView logs at https://dashboard.render.com", date: "2026-03-21T09:00:00Z", read: true, starred: false, important: false, hasAttachment: false, labels: ["deploy"], account: "openclawashish" },
  { id: "6", from: "Google Analytics", fromEmail: "analytics-noreply@google.com", subject: "Weekly traffic summary — 7 sites", preview: "Your weekly GA4 summary: Total sessions 12,847 (+14% vs last week)...", body: "Weekly Traffic Summary\n\nPeriod: Mar 15-21, 2026\nTotal Sessions: 12,847 (+14%)\nTotal Users: 9,231 (+11%)\nBounce Rate: 42.3% (-2.1%)\n\nTop Pages:\n1. /best-pest-control-tips - 2,341 views\n2. /nail-art-designs-2026 - 1,892 views\n3. /home - 1,456 views", date: "2026-03-21T06:00:00Z", read: false, starred: false, important: true, hasAttachment: true, labels: ["analytics"], account: "openclawashish" },
  { id: "7", from: "1Password", fromEmail: "support@1password.com", subject: "Security alert: New device sign-in", preview: "A new device signed into your 1Password account from Mac mini M4...", body: "New Device Sign-In\n\nDevice: Mac mini M4\nLocation: Odisha, India\nTime: March 22, 2026 9:15 AM IST\nBrowser: Chromium\n\nIf this wasn't you, change your password immediately.", date: "2026-03-22T03:45:00Z", read: true, starred: false, important: false, hasAttachment: false, labels: ["security"], account: "openclawashish" },
  { id: "8", from: "Namecheap", fromEmail: "support@namecheap.com", subject: "Domain renewal reminder: 3 domains expiring in 30 days", preview: "The following domains are expiring soon and need renewal...", body: "Domain Renewal Reminder\n\nThe following domains expire in 30 days:\n\n1. omhgshop.com - Expires Apr 21, 2026\n2. mnailschool.com - Expires Apr 23, 2026\n3. financecafe.in - Expires Apr 25, 2026\n\nRenew now to avoid losing them.\n\nNamecheap Team", date: "2026-03-20T10:00:00Z", read: false, starred: true, important: true, hasAttachment: false, labels: ["domains", "important"], account: "antarjyami" },
];

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

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// ---- Main Page ----
export default function EmailPage() {
  const [emails, setEmails] = useState<EmailMsg[]>(MOCK_EMAILS);
  const [selected, setSelected] = useState<EmailMsg | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "starred" | "important">("all");
  const [accountFilter, setAccountFilter] = useState<"all" | string>("all");
  const [apiData, setApiData] = useState<{ accounts: EmailAccount[]; setupRequired: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/email").then(r => r.json()).then(d => setApiData(d)).catch(() => {});
  }, []);

  const toggleStar = (id: string) => setEmails(prev => prev.map(e => e.id === id ? { ...e, starred: !e.starred } : e));
  const markRead = (id: string) => setEmails(prev => prev.map(e => e.id === id ? { ...e, read: true } : e));
  const archiveEmail = (id: string) => { setEmails(prev => prev.filter(e => e.id !== id)); if (selected?.id === id) setSelected(null); };

  const filtered = emails
    .filter(e => filter === "all" || (filter === "unread" && !e.read) || (filter === "starred" && e.starred) || (filter === "important" && e.important))
    .filter(e => accountFilter === "all" || e.account === accountFilter)
    .filter(e => !search || e.subject.toLowerCase().includes(search.toLowerCase()) || e.from.toLowerCase().includes(search.toLowerCase()));

  const unreadCount = emails.filter(e => !e.read).length;
  const starredCount = emails.filter(e => e.starred).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <Mail className="w-6 h-6" style={{ color: "var(--accent)" }} /> Email Hub
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {emails.length} emails · {unreadCount} unread · {starredCount} starred
            {apiData?.setupRequired && <span style={{ color: "#f9e2af" }}> · ⚠️ Using demo data (IMAP not connected)</span>}
          </p>
        </div>
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatsCard title="Total" value={emails.length} icon={<Mail />} iconColor="var(--accent)" subtitle="All emails" />
        <StatsCard title="Unread" value={unreadCount} icon={<Inbox />} iconColor={unreadCount > 0 ? "#89b4fa" : "var(--text-muted)"} subtitle={unreadCount > 0 ? "Needs attention" : "All caught up"} />
        <StatsCard title="Starred" value={starredCount} icon={<Star />} iconColor="#f9e2af" subtitle="Important" />
        <StatsCard title="Accounts" value={apiData?.accounts?.length || 2} icon={<Settings />} iconColor="var(--accent)" subtitle={apiData?.setupRequired ? "Not connected" : "Connected"} />
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search emails..."
            className="w-full text-sm rounded-lg pl-9 pr-3 py-2" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
        </div>
        <div className="flex gap-1">
          {(["all", "unread", "starred", "important"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
              style={{ backgroundColor: filter === f ? "var(--accent)" : "var(--surface-elevated)", color: filter === f ? "var(--bg)" : "var(--text-muted)" }}>
              {f} {f === "unread" ? `(${unreadCount})` : f === "starred" ? `(${starredCount})` : ""}
            </button>
          ))}
        </div>
        <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)}
          className="text-xs rounded-lg px-2 py-1.5" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          <option value="all">All Accounts</option>
          <option value="openclawashish">openclawashish@gmail.com</option>
          <option value="antarjyami">antarjyamisahu19@gmail.com</option>
        </select>
      </div>

      {/* Email List + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: "60vh" }}>
        {/* Email List */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <MailOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No emails match your filters</p>
              </div>
            ) : (
              filtered.map(email => (
                <button key={email.id} onClick={() => { setSelected(email); markRead(email.id); }}
                  className="w-full text-left p-3 transition-colors flex gap-3"
                  style={{
                    backgroundColor: selected?.id === email.id ? "var(--accent-soft)" : email.read ? "transparent" : "rgba(137, 180, 250, 0.03)",
                    borderBottom: "1px solid var(--border)",
                    borderLeft: selected?.id === email.id ? "3px solid var(--accent)" : "3px solid transparent",
                  }}>
                  {/* Star */}
                  <button onClick={e => { e.stopPropagation(); toggleStar(email.id); }} className="shrink-0 mt-1">
                    <Star className="w-4 h-4" style={{ color: email.starred ? "#f9e2af" : "var(--text-muted)", fill: email.starred ? "#f9e2af" : "none" }} />
                  </button>
                  
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
                    <div className={`text-xs truncate mt-0.5 ${!email.read ? "font-medium" : ""}`} style={{ color: !email.read ? "var(--text-primary)" : "var(--text-secondary)" }}>
                      {email.subject}
                    </div>
                    <div className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {email.preview.slice(0, 80)}...
                    </div>
                    {/* Labels */}
                    <div className="flex gap-1 mt-1.5">
                      {email.labels.map(l => (
                        <span key={l} className="text-[9px] px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: `${LABEL_COLORS[l] || "var(--text-muted)"}20`, color: LABEL_COLORS[l] || "var(--text-muted)" }}>
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!email.read && <div className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ backgroundColor: "#89b4fa" }} />}
                </button>
              ))
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
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleStar(selected.id)} className="p-1.5 rounded-lg" style={{ color: selected.starred ? "#f9e2af" : "var(--text-muted)" }}>
                      <Star className="w-4 h-4" style={{ fill: selected.starred ? "#f9e2af" : "none" }} />
                    </button>
                    <button onClick={() => archiveEmail(selected.id)} className="p-1.5 rounded-lg" style={{ color: "var(--text-muted)" }}>
                      <Archive className="w-4 h-4" />
                    </button>
                    <button onClick={() => archiveEmail(selected.id)} className="p-1.5 rounded-lg" style={{ color: "#f38ba8" }}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{selected.subject}</h2>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>
                    {selected.from[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{selected.from}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {selected.fromEmail} · {new Date(selected.date).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 mt-2">
                  {selected.labels.map(l => (
                    <span key={l} className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                      style={{ backgroundColor: `${LABEL_COLORS[l] || "var(--text-muted)"}20`, color: LABEL_COLORS[l] || "var(--text-muted)" }}>
                      <Tag className="w-2.5 h-2.5" /> {l}
                    </span>
                  ))}
                  {selected.hasAttachment && (
                    <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1"
                      style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)" }}>
                      <Paperclip className="w-2.5 h-2.5" /> Attachment
                    </span>
                  )}
                </div>
              </div>

              {/* Email Body */}
              <div className="flex-1 p-6 overflow-y-auto">
                <pre className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>
                  {selected.body}
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
