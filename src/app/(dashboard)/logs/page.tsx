"use client";

import { useEffect, useState, useRef } from "react";
import { ScrollText, FileText, RefreshCw, ArrowDown } from "lucide-react";

interface LogFile {
  name: string;
  size: number;
  modified: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

export default function LogsPage() {
  const [files, setFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [logContent, setLogContent] = useState("");
  const [totalLines, setTotalLines] = useState(0);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    fetch("/api/logs")
      .then((r) => r.json())
      .then((d) => { setFiles(d.files || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadLog = (name: string) => {
    setSelectedFile(name);
    setLoading(true);
    fetch(`/api/logs?file=${encodeURIComponent(name)}&lines=300`)
      .then((r) => r.json())
      .then((d) => {
        setLogContent(d.content || "");
        setTotalLines(d.totalLines || 0);
        setLoading(false);
        setTimeout(() => {
          if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
        }, 100);
      })
      .catch(() => setLoading(false));
  };

  const refresh = () => { if (selectedFile) loadLog(selectedFile); };

  useEffect(() => {
    if (!autoRefresh || !selectedFile) return;
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedFile]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Logs
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            View OpenClaw gateway and system logs
          </p>
        </div>
        {selectedFile && (
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: autoRefresh ? "var(--accent)" : "var(--card)",
                color: autoRefresh ? "white" : "var(--text-muted)",
                border: `1px solid ${autoRefresh ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {autoRefresh ? "Auto ●" : "Auto ○"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File list */}
        <div className="lg:col-span-1">
          <div className="rounded-xl p-3" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider px-2 mb-2" style={{ color: "var(--text-muted)" }}>
              Log Files
            </h2>
            <div className="space-y-0.5">
              {files.map((f) => (
                <button
                  key={f.name}
                  onClick={() => loadLog(f.name)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors"
                  style={{
                    backgroundColor: selectedFile === f.name ? "var(--surface-elevated)" : "transparent",
                    borderLeft: selectedFile === f.name ? "2px solid var(--accent)" : "2px solid transparent",
                  }}
                >
                  <FileText className="w-4 h-4 shrink-0" style={{ color: selectedFile === f.name ? "var(--accent)" : "var(--text-muted)" }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{f.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{formatSize(f.size)}</div>
                  </div>
                </button>
              ))}
              {files.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>No log files found</p>
              )}
            </div>
          </div>
        </div>

        {/* Log content */}
        <div className="lg:col-span-3">
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            {selectedFile ? (
              <>
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    <span className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>{selectedFile}</span>
                  </div>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{totalLines} total lines</span>
                </div>
                <pre
                  ref={logRef}
                  className="p-4 overflow-auto text-xs leading-5"
                  style={{
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-mono)",
                    maxHeight: "70vh",
                    backgroundColor: "#0A0A0F",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {loading ? "Loading..." : logContent || "Empty log file"}
                </pre>
              </>
            ) : (
              <div className="p-12 text-center">
                <ScrollText className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
                <p className="text-lg font-medium" style={{ color: "var(--text-secondary)" }}>
                  Select a log file
                </p>
                <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                  Choose a file from the sidebar to view logs
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
