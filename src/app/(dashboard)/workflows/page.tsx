"use client";

import { useEffect, useState } from "react";
import { GitBranch, Play, CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw, ChevronRight, Zap, Archive } from "lucide-react";

interface WorkflowStep {
  name: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  duration?: string;
}

interface WorkflowRun {
  id: string;
  startedAt: string;
  completedAt?: string;
  status: "running" | "success" | "failed";
  steps: WorkflowStep[];
  trigger: "manual" | "cron" | "event";
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: string[];
  schedule?: string;
  lastRun?: WorkflowRun;
  runs: WorkflowRun[];
  enabled: boolean;
}

const STEP_STATUS: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: { color: "var(--text-muted)", icon: <Clock className="w-3 h-3" /> },
  running: { color: "#89b4fa", icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  success: { color: "#a6e3a1", icon: <CheckCircle className="w-3 h-3" /> },
  failed: { color: "#f38ba8", icon: <XCircle className="w-3 h-3" /> },
  skipped: { color: "var(--text-muted)", icon: <Archive className="w-3 h-3" /> },
};

const RUN_STATUS: Record<string, { color: string; bg: string }> = {
  running: { color: "#89b4fa", bg: "rgba(137, 180, 250, 0.1)" },
  success: { color: "#a6e3a1", bg: "rgba(166, 227, 161, 0.1)" },
  failed: { color: "#f38ba8", bg: "rgba(243, 139, 168, 0.1)" },
};

function StepPipeline({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {steps.map((step, i) => {
        const sc = STEP_STATUS[step.status];
        return (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3" style={{ color: "var(--text-muted)" }} />}
            <div className="flex items-center gap-1 px-2 py-1 rounded text-xs" style={{ backgroundColor: "var(--surface-elevated)" }}>
              <span style={{ color: sc.color }}>{sc.icon}</span>
              <span style={{ color: "var(--text-secondary)" }}>{step.name}</span>
              {step.duration && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{step.duration}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkflowCard({ workflow, onTrigger }: { workflow: Workflow; onTrigger: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const lastRun = workflow.lastRun;
  const runStatus = lastRun ? RUN_STATUS[lastRun.status] : null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{workflow.name}</span>
            {workflow.schedule && (
              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)" }}>
                <Clock className="w-2.5 h-2.5 inline mr-0.5" />{workflow.schedule}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {lastRun && runStatus && (
              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: runStatus.bg, color: runStatus.color }}>
                {lastRun.status}
              </span>
            )}
            <button onClick={() => onTrigger(workflow.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}>
              <Play className="w-3 h-3" /> Run
            </button>
          </div>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{workflow.description}</p>

        {/* Step flow visual */}
        <div className="flex items-center gap-1 mb-2">
          {workflow.steps.map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <div className="w-4 h-px" style={{ backgroundColor: "var(--border)" }} />}
              <div className="px-2 py-1 rounded text-xs" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)" }}>
                {step}
              </div>
            </div>
          ))}
        </div>

        {/* Last run details */}
        {lastRun && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                Last run: {new Date(lastRun.startedAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
              </span>
              <button onClick={() => setExpanded(!expanded)} className="text-xs" style={{ color: "var(--accent)" }}>
                {expanded ? "Hide" : "Show"} steps
              </button>
            </div>
            {expanded && <StepPipeline steps={lastRun.steps} />}
          </div>
        )}
      </div>

      {/* Run history bar */}
      {workflow.runs.length > 0 && (
        <div className="flex gap-0.5 p-2" style={{ backgroundColor: "var(--surface-elevated)" }}>
          {workflow.runs.slice(-20).map((run, i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full" title={`${run.status} - ${new Date(run.startedAt).toLocaleDateString()}`}
              style={{ backgroundColor: RUN_STATUS[run.status]?.color || "var(--border)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workflows").then(r => r.json()).then(d => {
      setWorkflows(Array.isArray(d) ? d : d.workflows || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const triggerWorkflow = (id: string) => {
    // TODO: POST to /api/workflows/run
    alert(`Workflow ${id} triggered! (API integration pending)`);
  };

  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.enabled).length,
    lastSuccess: workflows.filter(w => w.lastRun?.status === "success").length,
    lastFailed: workflows.filter(w => w.lastRun?.status === "failed").length,
  };

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Workflows</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl p-6 animate-pulse" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="h-4 rounded w-1/3 mb-3" style={{ backgroundColor: "var(--border)" }} />
            <div className="h-3 rounded w-2/3" style={{ backgroundColor: "var(--border)" }} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <Zap className="w-6 h-6" style={{ color: "var(--accent)" }} />
            Workflows
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Automated pipelines and task sequences
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "var(--accent)" },
          { label: "Active", value: stats.active, color: "#a6e3a1" },
          { label: "Last Success", value: stats.lastSuccess, color: "#a6e3a1" },
          { label: "Last Failed", value: stats.lastFailed, color: stats.lastFailed > 0 ? "#f38ba8" : "#a6e3a1" },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Workflow Cards */}
      {workflows.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <GitBranch className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No workflows configured yet</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Create workflows in your OpenClaw config to see them here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workflows.map(w => <WorkflowCard key={w.id} workflow={w} onTrigger={triggerWorkflow} />)}
        </div>
      )}
    </div>
  );
}
