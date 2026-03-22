"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Landmark,
  DollarSign,
  Settings,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";

interface FinanceData {
  accounts: Array<{
    id: string;
    name: string;
    country: string;
    flag: string;
    currency: string;
    type: string;
    status: string;
  }>;
  revenueSources: Array<{
    name: string;
    category: string;
    status: string;
    icon: string;
  }>;
  aiCosts: {
    monthly: { claudeMax: number; minimaxPlus: number; total: number };
    previous: number;
    savings: number;
  };
  currencies: string[];
  setupRequired: boolean;
  setupOptions: Array<{
    name: string;
    difficulty: string;
    description: string;
  }>;
}

export default function FinancePage() {
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/finance")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Finance
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Finance Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Multi-currency financial overview across all entities
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Bank Accounts"
          value={d.accounts.length}
          icon={<Landmark />}
          iconColor="var(--accent)"
          subtitle={`${d.currencies.length} currencies tracked`}
        />
        <StatsCard
          title="Revenue Streams"
          value={d.revenueSources.filter((r) => r.status === "active").length}
          icon={<TrendingUp />}
          iconColor="var(--positive)"
          subtitle={`${d.revenueSources.length} total sources`}
        />
        <StatsCard
          title="AI Monthly Cost"
          value={`$${d.aiCosts.monthly.total}`}
          icon={<CreditCard />}
          iconColor="var(--warning)"
          subtitle={`↓ $${d.aiCosts.savings}/mo saved`}
        />
        <StatsCard
          title="Currencies"
          value={d.currencies.join(", ")}
          icon={<DollarSign />}
          iconColor="var(--info)"
          subtitle="Multi-currency support"
        />
      </div>

      {/* Setup Banner */}
      {d.setupRequired && (
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "var(--info-soft)", border: "1px solid rgba(10, 132, 255, 0.3)" }}
        >
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "var(--info)" }} />
            <div className="flex-1">
              <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>
                Connect Your Financial Data
              </h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                Choose how you want to bring transaction data into Mission Control:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {d.setupOptions.map((opt) => (
                  <div
                    key={opt.name}
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{opt.name}</span>
                      <span className={`badge ${opt.difficulty === "Easy" ? "badge-success" : "badge-warning"}`}>
                        {opt.difficulty}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{opt.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bank Accounts */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <Landmark className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Bank Accounts
          </h2>
          <div className="space-y-3">
            {d.accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: "20px" }}>{account.flag}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{account.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {account.type} · {account.currency}
                    </div>
                  </div>
                </div>
                <span className={`badge ${account.status === "connected" ? "badge-success" : "badge-warning"}`}>
                  {account.status === "connected" ? "Connected" : "Not Connected"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Sources */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <TrendingUp className="w-5 h-5" style={{ color: "var(--accent)" }} />
            Revenue Sources
          </h2>
          <div className="space-y-3">
            {d.revenueSources.map((source) => (
              <div
                key={source.name}
                className="flex items-center justify-between p-4 rounded-lg"
                style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: "20px" }}>{source.icon}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{source.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{source.category}</div>
                  </div>
                </div>
                <span className={`badge ${source.status === "active" ? "badge-success" : "badge-info"}`}>
                  {source.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Cost Breakdown */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          <CreditCard className="w-5 h-5" style={{ color: "var(--accent)" }} />
          AI Infrastructure Costs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)" }}>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Claude Max</div>
            <div className="text-2xl font-bold" style={{ color: "var(--accent)", fontFamily: "var(--font-heading)" }}>
              ${d.aiCosts.monthly.claudeMax}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Opus + Sonnet subscription</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)" }}>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>MiniMax Plus</div>
            <div className="text-2xl font-bold" style={{ color: "var(--info)", fontFamily: "var(--font-heading)" }}>
              ${d.aiCosts.monthly.minimaxPlus}
            </div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>Crons, heartbeats, subagents</div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--positive-soft)" }}>
            <div className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--positive)" }}>Monthly Savings</div>
            <div className="text-2xl font-bold" style={{ color: "var(--positive)", fontFamily: "var(--font-heading)" }}>
              ${d.aiCosts.savings}
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
              <span>${d.aiCosts.previous}</span>
              <ArrowRight className="w-3 h-3" />
              <span>${d.aiCosts.monthly.total}/mo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
