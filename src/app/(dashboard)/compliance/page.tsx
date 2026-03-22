"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  Building2,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Globe,
} from "lucide-react";

interface Filing {
  name: string;
  frequency: string;
  nextDue: string;
  status: string;
  company: string;
  companyId: string;
  flag: string;
}

interface Company {
  id: string;
  name: string;
  country: string;
  flag: string;
  type: string;
  status: string;
  filings: Array<{ name: string; frequency: string; nextDue: string; status: string }>;
}

interface ComplianceData {
  companies: Company[];
  allFilings: Filing[];
  summary: {
    totalCompanies: number;
    totalFilings: number;
    overdue: number;
    urgent: number;
    upcoming: number;
  };
}

export default function CompliancePage() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"timeline" | "company">("timeline");
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/compliance")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Compliance
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

  const d = data!;

  const statusConfig: Record<string, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
    overdue: { color: "var(--negative)", bg: "var(--negative-soft)", label: "OVERDUE", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
    urgent: { color: "var(--warning)", bg: "var(--warning-soft)", label: "URGENT", icon: <Clock className="w-3.5 h-3.5" /> },
    upcoming: { color: "var(--info)", bg: "var(--info-soft)", label: "UPCOMING", icon: <Calendar className="w-3.5 h-3.5" /> },
    pending: { color: "var(--text-muted)", bg: "var(--surface-elevated)", label: "PENDING", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  };

  const daysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return "Due today!";
    if (diff === 1) return "Due tomorrow";
    return `${diff} days left`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Business Compliance
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Company filings, deadlines, and regulatory status
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Companies"
          value={d.summary.totalCompanies}
          icon={<Building2 />}
          iconColor="var(--accent)"
          subtitle="Active entities"
        />
        <StatsCard
          title="Overdue"
          value={d.summary.overdue}
          icon={<AlertTriangle />}
          iconColor={d.summary.overdue > 0 ? "var(--negative)" : "var(--positive)"}
          subtitle={d.summary.overdue > 0 ? "Needs immediate action!" : "All clear ✓"}
        />
        <StatsCard
          title="Urgent (≤7 days)"
          value={d.summary.urgent}
          icon={<Clock />}
          iconColor="var(--warning)"
          subtitle="Due within a week"
        />
        <StatsCard
          title="Total Filings"
          value={d.summary.totalFilings}
          icon={<Calendar />}
          iconColor="var(--info)"
          subtitle={`${d.summary.upcoming} upcoming`}
        />
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2">
        {(["timeline", "company"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
            style={{
              backgroundColor: view === v ? "var(--accent-soft)" : "var(--surface-elevated)",
              color: view === v ? "var(--accent)" : "var(--text-muted)",
              border: `1px solid ${view === v ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            {v === "timeline" ? "📅 Timeline" : "🏢 By Company"}
          </button>
        ))}
      </div>

      {/* Timeline View */}
      {view === "timeline" && (
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="space-y-3">
            {d.allFilings.map((filing, i) => {
              const sc = statusConfig[filing.status] || statusConfig.pending;
              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg transition-colors"
                  style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: sc.bg }}
                    >
                      {filing.flag}
                    </div>
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {filing.name}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {filing.company} · {filing.frequency}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
                        {filing.nextDue}
                      </div>
                      <div className="text-xs" style={{ color: sc.color }}>
                        {daysUntil(filing.nextDue)}
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
                      style={{ backgroundColor: sc.bg, color: sc.color }}
                    >
                      {sc.icon}
                      {sc.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Company View */}
      {view === "company" && (
        <div className="space-y-4">
          {d.companies.map((company) => (
            <div
              key={company.id}
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              <button
                onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                className="w-full flex items-center gap-4 p-4 transition-colors"
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span style={{ fontSize: "24px" }}>{company.flag}</span>
                <div className="text-left">
                  <div className="text-base font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                    {company.name}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {company.type} · {company.country}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span className="badge badge-info">{company.filings.length} filings</span>
                  {company.filings.some((f) => f.status === "overdue") && (
                    <span className="badge badge-error">Has overdue</span>
                  )}
                  {expandedCompany === company.id ? (
                    <ChevronDown className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  ) : (
                    <ChevronRight className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                  )}
                </div>
              </button>

              {expandedCompany === company.id && (
                <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="pt-3 space-y-2">
                    {company.filings.map((filing, i) => {
                      const sc = statusConfig[filing.status] || statusConfig.pending;
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{ backgroundColor: "var(--surface-elevated)" }}
                        >
                          <div>
                            <div className="text-sm" style={{ color: "var(--text-primary)" }}>{filing.name}</div>
                            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{filing.frequency}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>{filing.nextDue}</span>
                            <span
                              className="text-xs px-2 py-0.5 rounded font-semibold"
                              style={{ backgroundColor: sc.bg, color: sc.color }}
                            >
                              {sc.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      <div className="text-center py-2">
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          ⚠️ Dates are estimates. Verify with your CA/accountant for exact deadlines.
        </p>
      </div>
    </div>
  );
}
