"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  Mail,
  Inbox,
  CheckCircle,
  AlertTriangle,
  Settings,
  ExternalLink,
  Shield,
} from "lucide-react";

interface EmailAccount {
  id: string;
  email: string;
  provider: string;
  icon: string;
  status: string;
  purpose: string;
}

interface EmailData {
  accounts: EmailAccount[];
  totalAccounts: number;
  connectedAccounts: number;
  setupRequired: boolean;
  setupInstructions: string[];
}

export default function EmailPage() {
  const [data, setData] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/email")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Email Hub
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
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Email Hub
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Unified email dashboard across all accounts (read-only)
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Email Accounts"
          value={d.totalAccounts}
          icon={<Mail />}
          iconColor="var(--accent)"
          subtitle="Known accounts"
        />
        <StatsCard
          title="Connected"
          value={d.connectedAccounts}
          icon={<CheckCircle />}
          iconColor={d.connectedAccounts > 0 ? "var(--positive)" : "var(--text-muted)"}
          subtitle={d.connectedAccounts > 0 ? "Active connections" : "Not yet connected"}
        />
        <StatsCard
          title="Status"
          value={d.setupRequired ? "Setup Needed" : "Active"}
          icon={<Settings />}
          iconColor={d.setupRequired ? "var(--warning)" : "var(--positive)"}
          subtitle={d.setupRequired ? "IMAP credentials required" : "All systems go"}
        />
      </div>

      {/* Setup Required Banner */}
      {d.setupRequired && (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "var(--warning-soft)", border: "1px solid rgba(255, 214, 10, 0.3)" }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--warning)" }} />
            <div>
              <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Email Integration Setup Required
              </h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                To enable email fetching, IMAP credentials need to be configured. All access is read-only for security.
              </p>
              <div className="space-y-2">
                {d.setupInstructions.map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs font-bold mt-0.5" style={{ color: "var(--accent)" }}>{i + 1}.</span>
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{step.replace(/^\d+\.\s*/, "")}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Accounts */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          <Inbox className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Email Accounts
        </h2>
        <div className="space-y-3">
          {d.accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 rounded-lg"
              style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: "var(--accent-soft)" }}
                >
                  {account.icon}
                </div>
                <div>
                  <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    {account.email}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {account.provider} · {account.purpose}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`badge ${account.status === "connected" ? "badge-success" : "badge-warning"}`}>
                  {account.status === "connected" ? "Connected" : "Not Connected"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Preview */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          <Shield className="w-5 h-5" style={{ color: "var(--accent)" }} />
          Features (When Connected)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { emoji: "📨", title: "Unified Inbox", desc: "All emails in one view" },
            { emoji: "📊", title: "Daily Digest", desc: "AI-generated email summary" },
            { emoji: "⭐", title: "Priority Flagging", desc: "Auto-detect important emails" },
            { emoji: "🔍", title: "Cross-Account Search", desc: "Search all inboxes at once" },
            { emoji: "📋", title: "Action Items", desc: "Extract tasks from emails" },
            { emoji: "🔒", title: "Read-Only", desc: "No sending — safe & secure" },
          ].map((feature) => (
            <div
              key={feature.title}
              className="p-3 rounded-lg"
              style={{ backgroundColor: "var(--surface-elevated)" }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{feature.emoji}</span>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{feature.title}</span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
