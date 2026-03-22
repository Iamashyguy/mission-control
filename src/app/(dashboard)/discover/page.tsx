"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { Compass, Globe, FileText, AlertTriangle, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Site {
  site_id: string;
  site_name: string;
  domain: string;
  niche: string;
  status: string;
  country: string;
  created_at: string;
  day_number: number;
  peak_active_users: number;
  postCount: number;
}

interface DiscoverData {
  sites: Site[];
  titlePool: { total: number };
  errors: { total: number; critical: number; recent: Array<Record<string, unknown>> };
  status: Record<string, unknown> | null;
}

export default function DiscoverPage() {
  const [data, setData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/discover")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Discover Sites
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

  const d = data || { sites: [], titlePool: { total: 0 }, errors: { total: 0, critical: 0, recent: [] }, status: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Discover Sites
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Google Discover publishing pipeline
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Sites" value={d.sites.length} icon={<Globe />} iconColor="var(--accent)" />
        <StatsCard
          title="Total Posts"
          value={d.sites.reduce((sum, s) => sum + (s.postCount || 0), 0)}
          icon={<FileText />}
          iconColor="var(--info)"
        />
        <StatsCard title="Title Pool" value={d.titlePool.total} icon={<Compass />} iconColor="var(--positive)" />
        <StatsCard
          title="Errors"
          value={d.errors.total}
          icon={<AlertTriangle />}
          iconColor={d.errors.critical > 0 ? "var(--error)" : "var(--positive)"}
          subtitle={`${d.errors.critical} critical`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts per Site */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Posts per Site
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.sites.map(s => ({ name: s.site_name.length > 12 ? s.site_name.slice(0, 12) + "…" : s.site_name, posts: s.postCount }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fill: "#8A8A8A", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8A8A8A", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
              <Bar dataKey="posts" radius={[4, 4, 0, 0]}>
                {d.sites.map((_, i) => <Cell key={i} fill={["#3B82F6","#32D74B","#0A84FF","#FFD60A","#A855F7","#FF6B6B","#FF9F43"][i % 7]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Peak Users per Site */}
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Peak Active Users
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.sites.map(s => ({ name: s.site_name.length > 12 ? s.site_name.slice(0, 12) + "…" : s.site_name, users: s.peak_active_users || 0 }))} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="name" tick={{ fill: "#8A8A8A", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8A8A8A", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #2A2A2A", borderRadius: "8px", color: "#fff", fontSize: "12px" }} />
              <Bar dataKey="users" radius={[4, 4, 0, 0]}>
                {d.sites.map((_, i) => <Cell key={i} fill={["#32D74B","#3B82F6","#FFD60A","#A855F7","#0A84FF","#FF6B6B","#FF9F43"][i % 7]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sites Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="p-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Sites Overview
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["ID", "Site", "Niche", "Status", "Day", "Posts", "Peak Users"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.sites.map((site) => (
                <tr
                  key={site.site_id}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-elevated)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: "var(--text-muted)" }}>
                    {site.site_id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {site.site_name}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {site.domain}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge badge-info">{site.niche}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="badge"
                      style={{
                        backgroundColor:
                          site.status === "active"
                            ? "var(--positive-soft)"
                            : site.status === "warmup"
                              ? "var(--warning-soft)"
                              : "var(--negative-soft)",
                        color:
                          site.status === "active"
                            ? "var(--positive)"
                            : site.status === "warmup"
                              ? "var(--warning)"
                              : "var(--negative)",
                      }}
                    >
                      {site.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                    {site.day_number || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                    {site.postCount}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {site.peak_active_users > 0 && (
                        <TrendingUp style={{ width: "14px", height: "14px", color: "var(--positive)" }} />
                      )}
                      <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                        {site.peak_active_users || 0}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {d.sites.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    No sites found. Check Discover DB connection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Errors */}
      {d.errors.recent.length > 0 && (
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <AlertTriangle className="w-5 h-5" style={{ color: "var(--error)" }} />
            Recent Errors
          </h2>
          <div className="space-y-2">
            {d.errors.recent.map((err, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{ backgroundColor: "var(--surface-elevated)" }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    marginTop: "6px",
                    backgroundColor: (err.severity as string) === "critical" ? "var(--error)" : "var(--warning)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                    {err.error_message as string}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {err.component as string} · {err.site_id as string} · {err.timestamp as string}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
