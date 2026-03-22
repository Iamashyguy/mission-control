"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, GripVertical, Trash2, Edit2, Check, X, Flag, Bot, Clock, RefreshCw } from "lucide-react";

type Priority = "P1" | "P2" | "P3" | "P4";
type Column = "inbox" | "today" | "in-progress" | "review" | "done";

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  agent?: string;
  column: Column;
  createdAt: string;
  tags: string[];
}

const COLUMNS: { id: Column; label: string; color: string; emoji: string }[] = [
  { id: "inbox", label: "Inbox", color: "#a6adc8", emoji: "📥" },
  { id: "today", label: "Today", color: "#fab387", emoji: "🎯" },
  { id: "in-progress", label: "In Progress", color: "#89b4fa", emoji: "🔧" },
  { id: "review", label: "Review", color: "#cba6f7", emoji: "👀" },
  { id: "done", label: "Done", color: "#a6e3a1", emoji: "✅" },
];

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string }> = {
  P1: { color: "#f38ba8", label: "Critical" },
  P2: { color: "#f9e2af", label: "High" },
  P3: { color: "#89b4fa", label: "Medium" },
  P4: { color: "#a6adc8", label: "Low" },
};

const INITIAL_TASKS: Task[] = [];

function TaskCard({ task, onMove, onDelete, onEdit }: {
  task: Task;
  onMove: (id: string, col: Column) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, updates: Partial<Task>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const pc = PRIORITY_CONFIG[task.priority];
  const colIdx = COLUMNS.findIndex(c => c.id === task.column);

  return (
    <div className="group rounded-lg p-3 transition-all" style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)", borderLeft: `3px solid ${pc.color}` }}
      draggable onDragStart={(e) => e.dataTransfer.setData("taskId", task.id)}>
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <div className="flex-1 flex gap-1">
            <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
              className="flex-1 text-sm rounded px-2 py-1" style={{ backgroundColor: "var(--card)", color: "var(--text-primary)", border: "1px solid var(--accent)" }}
              autoFocus onKeyDown={e => { if (e.key === "Enter") { onEdit(task.id, { title: editTitle }); setEditing(false); } if (e.key === "Escape") setEditing(false); }} />
            <button onClick={() => { onEdit(task.id, { title: editTitle }); setEditing(false); }}><Check className="w-4 h-4" style={{ color: "#a6e3a1" }} /></button>
            <button onClick={() => setEditing(false)}><X className="w-4 h-4" style={{ color: "#f38ba8" }} /></button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium leading-tight" style={{ color: "var(--text-primary)" }}>{task.title}</div>
              {task.description && <div className="text-xs mt-1 line-clamp-2" style={{ color: "var(--text-muted)" }}>{task.description}</div>}
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => setEditing(true)} className="p-1 rounded" style={{ color: "var(--text-muted)" }}><Edit2 className="w-3 h-3" /></button>
              <button onClick={() => onDelete(task.id)} className="p-1 rounded" style={{ color: "#f38ba8" }}><Trash2 className="w-3 h-3" /></button>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${pc.color}20`, color: pc.color }}>{task.priority}</span>
        {task.agent && (
          <span className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--card)", color: "var(--text-secondary)" }}>
            <Bot className="w-2.5 h-2.5" /> {task.agent}
          </span>
        )}
        {task.tags.map(t => (
          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--card)", color: "var(--text-muted)" }}>{t}</span>
        ))}
      </div>

      {/* Quick move buttons */}
      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {COLUMNS.filter((_, i) => i !== colIdx).map(col => (
          <button key={col.id} onClick={() => onMove(task.id, col.id)}
            className="text-[10px] px-2 py-0.5 rounded transition-colors"
            style={{ backgroundColor: `${col.color}15`, color: col.color, border: `1px solid ${col.color}30` }}>
            → {col.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>("P3");
  const [showAdd, setShowAdd] = useState(false);
  const [dragOverCol, setDragOverCol] = useState<Column | null>(null);
  const [filterPriority, setFilterPriority] = useState<Priority | "all">("all");
  const [loading, setLoading] = useState(true);

  // Load tasks from API
  const fetchTasks = useCallback(() => {
    fetch("/api/tasks")
      .then(r => r.json())
      .then(data => {
        const mapped = (data.tasks || []).map((t: Record<string, unknown>) => ({
          id: String(t.id),
          title: String(t.title || ""),
          description: String(t.description || ""),
          priority: (t.priority as Priority) || "P3",
          agent: String(t.agent || ""),
          column: ((t.column_id || t.column || "inbox") as Column),
          createdAt: String(t.created_at || t.createdAt || new Date().toISOString()),
          tags: Array.isArray(t.tags) ? (t.tags as string[]) : typeof t.tags === "string" ? (() => { try { return JSON.parse(t.tags as string); } catch { return []; } })() : [],
        }));
        setTasks(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const moveTask = useCallback((id: string, col: Column) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, column: col } : t));
    // Persist to API
    fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, column_id: col }),
    }).catch(() => {});
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    fetch(`/api/tasks?id=${id}`, { method: "DELETE" }).catch(() => {});
  }, []);

  const editTask = useCallback((id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    }).catch(() => {});
  }, []);

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    setShowAdd(false);
    setNewTaskTitle("");
    // Persist to API
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTaskTitle.trim(), priority: newTaskPriority }),
    })
      .then(() => fetchTasks())
      .catch(() => {});
  };

  const filtered = filterPriority === "all" ? tasks : tasks.filter(t => t.priority === filterPriority);
  const stats = {
    total: tasks.length,
    inbox: tasks.filter(t => t.column === "inbox").length,
    inProgress: tasks.filter(t => t.column === "in-progress").length,
    done: tasks.filter(t => t.column === "done").length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            📋 Task Board
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {stats.total} tasks · {stats.inbox} inbox · {stats.inProgress} in progress · {stats.done} done
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Priority filter */}
          <div className="flex gap-1">
            {(["all", "P1", "P2", "P3", "P4"] as const).map(p => (
              <button key={p} onClick={() => setFilterPriority(p)}
                className="px-2 py-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: filterPriority === p ? (p === "all" ? "var(--accent)" : PRIORITY_CONFIG[p as Priority]?.color || "var(--accent)") : "var(--surface-elevated)",
                  color: filterPriority === p ? "var(--bg)" : "var(--text-muted)",
                }}>
                {p === "all" ? "All" : p}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}>
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div className="rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--accent)" }}>
          <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Task title..."
            className="flex-1 text-sm rounded-lg px-3 py-2" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
            autoFocus onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setShowAdd(false); }} />
          <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as Priority)}
            className="text-xs rounded-lg px-2 py-2" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
            <option value="P1">P1 Critical</option>
            <option value="P2">P2 High</option>
            <option value="P3">P3 Medium</option>
            <option value="P4">P4 Low</option>
          </select>
          <button onClick={addTask} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--accent)", color: "var(--bg)" }}>Add</button>
          <button onClick={() => setShowAdd(false)} className="p-2" style={{ color: "var(--text-muted)" }}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Kanban Board */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-sm" style={{ color: "var(--text-muted)" }}>
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Loading tasks...
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ minHeight: "60vh" }}>
        {COLUMNS.map(col => {
          const colTasks = filtered.filter(t => t.column === col.id);
          return (
            <div key={col.id}
              className="rounded-xl p-3 flex flex-col"
              style={{
                backgroundColor: dragOverCol === col.id ? `${col.color}10` : "var(--card)",
                border: `1px solid ${dragOverCol === col.id ? col.color : "var(--border)"}`,
                transition: "all 0.2s",
              }}
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={e => { e.preventDefault(); setDragOverCol(null); const id = e.dataTransfer.getData("taskId"); if (id) moveTask(id, col.id); }}>
              
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span>{col.emoji}</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{col.label}</span>
                </div>
                <span className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${col.color}20`, color: col.color }}>
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="text-center py-8 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)", border: "1px dashed var(--border)" }}>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>Drop tasks here</p>
                  </div>
                ) : (
                  colTasks.map(task => (
                    <TaskCard key={task.id} task={task} onMove={moveTask} onDelete={deleteTask} onEdit={editTask} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}
