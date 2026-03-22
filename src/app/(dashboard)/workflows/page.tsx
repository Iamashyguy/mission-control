"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { Workflow, Play, Clock, CheckCircle, ChevronRight } from "lucide-react";

interface WFData {
  templates: Array<{ id: string; name: string; steps: string[]; status: string; runs: string; icon: string }>;
  totalActive: number; totalPlanned: number;
}

export default function WorkflowsPage() {
  const [data, setData] = useState<WFData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { fetch("/api/workflows").then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading) return <div className="space-y-6"><h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Workflows</h1></div>;
  const d = data!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Workflows</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Multi-step automation pipelines</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard title="Active Workflows" value={d.totalActive} icon={<Play />} iconColor="var(--positive)" subtitle="Running automations" />
        <StatsCard title="Planned" value={d.totalPlanned} icon={<Clock />} iconColor="var(--warning)" subtitle="Not yet scheduled" />
        <StatsCard title="Total" value={d.templates.length} icon={<Workflow />} iconColor="var(--accent)" subtitle="All workflows" />
      </div>

      <div className="space-y-3">
        {d.templates.map(wf => (
          <div key={wf.id} className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: `1px solid ${expanded === wf.id ? "var(--accent)" : "var(--border)"}` }}>
            <button onClick={() => setExpanded(expanded === wf.id ? null : wf.id)} className="w-full flex items-center gap-4 p-4"
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--surface-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <span className="text-2xl">{wf.icon}</span>
              <div className="text-left flex-1">
                <div className="text-sm font-semibold" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>{wf.name}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{wf.steps.length} steps · {wf.runs}</div>
              </div>
              <span className={`badge ${wf.status === "active" ? "badge-success" : "badge-warning"}`}>{wf.status}</span>
              <ChevronRight className={`w-4 h-4 transition-transform ${expanded === wf.id ? "rotate-90" : ""}`} style={{ color: "var(--text-muted)" }} />
            </button>
            {expanded === wf.id && (
              <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="pt-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {wf.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>{i+1}</div>
                          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{step}</span>
                        </div>
                        {i < wf.steps.length - 1 && <ChevronRight className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
