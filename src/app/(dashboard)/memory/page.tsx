"use client";

import { useEffect, useState } from "react";
import { Brain, FileText, Folder, FolderOpen, ArrowLeft, Clock, Edit3, Save, X, Network, List, Eye, Code2 } from "lucide-react";
import { MemoryGraph } from "@/components/MemoryGraph";
import { MarkdownPreview } from "@/components/MarkdownPreview";

interface FileEntry {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  modified: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function formatDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return iso; }
}

export default function MemoryPage() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [recentMemory, setRecentMemory] = useState<FileEntry[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"browser" | "graph">("browser");
  const [editViewMode, setEditViewMode] = useState<"edit" | "preview" | "split">("edit");

  const canEdit = fileName.endsWith(".md") || fileName.endsWith(".txt");

  const startEdit = () => { setEditContent(fileContent || ""); setEditing(true); setSaveMsg(null); };
  const cancelEdit = () => { setEditing(false); setSaveMsg(null); };
  const saveFile = async () => {
    setSaving(true); setSaveMsg(null);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: fileName, content: editContent }),
      });
      const data = await res.json();
      if (data.success) {
        setFileContent(editContent);
        setEditing(false);
        setSaveMsg("✅ Saved!");
        setTimeout(() => setSaveMsg(null), 3000);
      } else {
        setSaveMsg(`❌ ${data.error}`);
      }
    } catch { setSaveMsg("❌ Failed to save"); }
    setSaving(false);
  };

  const browse = (dir: string) => {
    setFileContent(null);
    setLoading(true);
    fetch(`/api/memory?browse=${encodeURIComponent(dir)}`)
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.entries || []);
        setRecentMemory(d.recentMemory || []);
        setCurrentPath(dir);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const openFile = (filePath: string) => {
    setLoading(true);
    fetch(`/api/memory?path=${encodeURIComponent(filePath)}`)
      .then((r) => r.json())
      .then((d) => {
        setFileContent(d.content || "");
        setFileName(filePath);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { browse(""); }, []);

  const parentPath = currentPath ? currentPath.split("/").slice(0, -1).join("/") : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Memory Browser
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Browse workspace files, memory entries, and decisions
          </p>
        </div>
        <div className="flex gap-1" style={{ backgroundColor: "var(--surface)", borderRadius: 8, padding: 4 }}>
          {[
            { id: "browser" as const, label: "Browser", icon: List },
            { id: "graph" as const, label: "Knowledge Graph", icon: Network },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? "var(--accent)" : "transparent",
                color: activeTab === tab.id ? "#fff" : "var(--text-muted)",
                fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge Graph View */}
      {activeTab === "graph" && <MemoryGraph />}

      {/* Browser View */}
      {activeTab === "browser" && (fileContent !== null ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setFileContent(null); setEditing(false); browse(currentPath); }}
              className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: "var(--accent)", backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            {canEdit && !editing && (
              <button onClick={startEdit}
                className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: "var(--positive)", backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                <Edit3 className="w-4 h-4" /> Edit
              </button>
            )}
            {editing && (
              <>
                <button onClick={saveFile} disabled={saving}
                  className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: "white", backgroundColor: "var(--accent)", border: "1px solid var(--accent)", opacity: saving ? 0.6 : 1 }}>
                  <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
                </button>
                <button onClick={cancelEdit}
                  className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
                  style={{ color: "var(--negative)", backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                  <X className="w-4 h-4" /> Cancel
                </button>
              </>
            )}
            {saveMsg && <span className="text-sm ml-2">{saveMsg}</span>}
          </div>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: `1px solid ${editing ? "var(--accent)" : "var(--border)"}` }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <FileText className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <span className="text-sm font-mono font-medium" style={{ color: "var(--text-primary)" }}>{fileName}</span>
              {editing && <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}>EDITING</span>}
            </div>
            {editing ? (
              <div>
                {/* Edit/Preview/Split toggle */}
                <div className="flex items-center gap-1 px-4 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  {[
                    { id: "edit" as const, label: "Edit", icon: Code2 },
                    { id: "preview" as const, label: "Preview", icon: Eye },
                    { id: "split" as const, label: "Split", icon: List },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setEditViewMode(mode.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                      style={{
                        backgroundColor: editViewMode === mode.id ? "var(--accent)" : "transparent",
                        color: editViewMode === mode.id ? "white" : "var(--text-secondary)",
                        border: "none", cursor: "pointer",
                      }}
                    >
                      <mode.icon className="w-3.5 h-3.5" /> {mode.label}
                    </button>
                  ))}
                  <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>⌘S to save</span>
                </div>
                <div className={editViewMode === "split" ? "grid grid-cols-2" : ""} style={editViewMode === "split" ? { borderTop: "none" } : {}}>
                  {(editViewMode === "edit" || editViewMode === "split") && (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveFile(); }
                        if (e.key === "Tab") { e.preventDefault(); const s = e.currentTarget.selectionStart; const end = e.currentTarget.selectionEnd; const v = editContent.substring(0, s) + "  " + editContent.substring(end); setEditContent(v); setTimeout(() => { e.currentTarget.selectionStart = e.currentTarget.selectionEnd = s + 2; }, 0); }
                      }}
                      className="w-full p-4 text-sm leading-relaxed min-h-[70vh] resize-none outline-none"
                      style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", backgroundColor: "transparent", border: "none", borderRight: editViewMode === "split" ? "1px solid var(--border)" : "none" }}
                      spellCheck={false}
                    />
                  )}
                  {(editViewMode === "preview" || editViewMode === "split") && (
                    <div className="min-h-[70vh] overflow-auto">
                      <MarkdownPreview content={editContent} />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              canEdit && fileName.endsWith(".md") ? (
                <div className="max-h-[70vh] overflow-auto">
                  <MarkdownPreview content={fileContent || ""} />
                </div>
              ) : (
                <pre
                  className="p-4 overflow-auto text-sm leading-relaxed max-h-[70vh]"
                  style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                >
                  {fileContent}
                </pre>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Memory Files */}
          <div className="lg:col-span-1">
            <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <Clock className="w-4 h-4" /> Recent Memory
              </h2>
              <div className="space-y-1">
                {recentMemory.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => openFile(f.path)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors"
                    style={{ backgroundColor: "transparent" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-elevated)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <Brain className="w-4 h-4 shrink-0" style={{ color: "var(--accent)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{f.name}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{formatSize(f.size)} · {formatDate(f.modified)}</div>
                    </div>
                  </button>
                ))}
                {recentMemory.length === 0 && (
                  <p className="text-xs py-2" style={{ color: "var(--text-muted)" }}>No memory files found</p>
                )}
              </div>
            </div>

            {/* Quick access files */}
            <div className="rounded-xl p-4 mt-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                Quick Access
              </h2>
              <div className="space-y-1">
                {["MEMORY.md", "context.md", "decisions.md", "SOUL.md", "USER.md", "IDENTITY.md", "TOOLS.md"].map((f) => (
                  <button
                    key={f}
                    onClick={() => openFile(f)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors"
                    style={{ backgroundColor: "transparent" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-elevated)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--info)" }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{f}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* File browser */}
          <div className="lg:col-span-2">
            <div className="rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
                <FolderOpen className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span className="text-sm font-mono" style={{ color: "var(--text-secondary)" }}>
                  workspace/{currentPath || ""}
                </span>
              </div>
              <div className="p-2">
                {parentPath !== null && (
                  <button
                    onClick={() => browse(parentPath)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors"
                    style={{ backgroundColor: "transparent" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-elevated)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <ArrowLeft className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>..</span>
                  </button>
                )}
                {loading ? (
                  <div className="py-8 text-center">
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading...</p>
                  </div>
                ) : (
                  entries.map((entry) => (
                    <button
                      key={entry.path}
                      onClick={() => entry.type === "dir" ? browse(entry.path) : openFile(entry.path)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                      style={{ backgroundColor: "transparent" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-elevated)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      {entry.type === "dir" ? (
                        <Folder className="w-4 h-4 shrink-0" style={{ color: "var(--warning)" }} />
                      ) : (
                        <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
                      )}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm truncate block" style={{ color: "var(--text-primary)" }}>{entry.name}</span>
                      </div>
                      <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                        {entry.type === "file" ? formatSize(entry.size) : ""}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                        {formatDate(entry.modified)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
