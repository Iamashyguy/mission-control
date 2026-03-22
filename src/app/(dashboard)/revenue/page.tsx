"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Settings, Globe } from "lucide-react";

interface RevenueData {
  revenueSources: Array<{ id: string; name: string; icon: string; status: string; category: string; connected: boolean }>;
  costs: { ai: { monthly: number }; hosting: { monthly: number }; tools: { monthly: number }; totalMonthly: number };
  sites: Array<{ name: string; niche: string; monetization: string; status: string }>;
  setupRequired: boolean;
  integrationOptions: Array<{ name: string; difficulty: string; description: string }>;
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch("/api/revenue").then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Revenue</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="rounded-xl p-6 animate-pulse" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}><div className="h-8 rounded w-1/2" style={{ backgroundColor: "var(--border)" }} /></div>)}</div>
    </div>
  );

  const d = data!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Revenue Dashboard</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Combined revenue tracking across all income sources</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Revenue Sources" value={d.revenueSources.filter(r => r.status === "active").length} icon={<TrendingUp />} iconColor="var(--positive)" subtitle={`${d.revenueSources.length} total`} />
        <StatsCard title="Monetized Sites" value={d.sites.length} icon={<Globe />} iconColor="var(--accent)" subtitle="Active sites" />
        <StatsCard title="Monthly Costs" value={`$${d.costs.totalMonthly}`} icon={<TrendingDown />} iconColor="var(--warning)" subtitle="AI + hosting + tools" />
        <StatsCard title="Data Status" value={d.setupRequired ? "Not Connected" : "Live"} icon={<BarChart3 />} iconColor={d.setupRequired ? "var(--text-muted)" : "var(--positive)"} subtitle={d.setupRequired ? "Connect revenue APIs" : "Real-time tracking"} />
      </div>

      {d.setupRequired && (
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--info-soft)", border: "1px solid rgba(10,132,255,0.3)" }}>
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 mt-0.5" style={{ color: "var(--info)" }} />
            <div className="flex-1">
              <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Connect Revenue Data</h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>Revenue tracking requires connecting to your ad platforms and affiliate networks:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {d.integrationOptions.map(opt => (
                  <div key={opt.name} className="p-3 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.05)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{opt.name}</span>
                      <span className={`badge ${opt.difficulty === "Easy" ? "badge-success" : "badge-warning"}`}>{opt.difficulty}</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{opt.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <TrendingUp className="w-5 h-5" style={{ color: "var(--accent)" }} /> Revenue Sources
          </h2>
          <div className="space-y-3">
            {d.revenueSources.map(src => (
              <div key={src.id} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: "20px" }}>{src.icon}</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{src.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{src.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`badge ${src.connected ? "badge-success" : "badge-warning"}`}>{src.connected ? "Connected" : "Not Connected"}</span>
                  <span className={`badge ${src.status === "active" ? "badge-success" : "badge-info"}`}>{src.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
              <DollarSign className="w-5 h-5" style={{ color: "var(--accent)" }} /> Monthly Cost Breakdown
            </h2>
            <div className="space-y-3">
              {[
                { label: "AI Infrastructure", amount: d.costs.ai.monthly, color: "var(--accent)" },
                { label: "Hosting", amount: d.costs.hosting.monthly, color: "var(--info)" },
                { label: "Tools & Subscriptions", amount: d.costs.tools.monthly, color: "var(--warning)" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{item.label}</span>
                  </div>
                  <span className="text-sm font-bold font-mono" style={{ color: item.color }}>${item.amount}</span>
                </div>
              ))}
              <div className="pt-2 mt-2" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Total</span>
                  <span className="text-lg font-bold font-mono" style={{ color: "var(--accent)" }}>${d.costs.totalMonthly}/mo</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
              <Globe className="w-5 h-5" style={{ color: "var(--accent)" }} /> Monetized Sites
            </h2>
            <div className="space-y-2">
              {d.sites.map(site => (
                <div key={site.name} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)" }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{site.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{site.niche} · {site.monetization}</div>
                  </div>
                  <span className="badge badge-success">{site.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
