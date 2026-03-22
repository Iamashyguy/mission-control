"use client";

import { useEffect, useState } from "react";
import { Brain, FileText, Folder, FolderOpen, ArrowLeft, Clock } from "lucide-react";

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
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Memory Browser
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Browse workspace files, memory entries, and decisions
        </p>
      </div>

      {/* File content view */}
      {fileContent !== null ? (
        <div className="space-y-3">
          <button
            onClick={() => { setFileContent(null); browse(currentPath); }}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: "var(--accent)", backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to files
          </button>
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <FileText className="w-4 h-4" style={{ color: "var(--accent)" }} />
              <span className="text-sm font-mono font-medium" style={{ color: "var(--text-primary)" }}>{fileName}</span>
            </div>
            <pre
              className="p-4 overflow-auto text-sm leading-relaxed max-h-[70vh]"
              style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {fileContent}
            </pre>
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
      )}
    </div>
  );
}
