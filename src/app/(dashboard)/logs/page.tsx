"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { ScrollText, FileText, RefreshCw, ArrowDown, Search, Filter, X } from "lucide-react";

interface LogFile {
  name: string;
  size: number;
  modified: string;
}

interface ParsedLine {
  raw: string;
  level: "error" | "warn" | "info" | "debug" | "unknown";
  timestamp?: string;
}

const LEVEL_COLORS: Record<string, { text: string; bg: string; label: string }> = {
  error: { text: "#f38ba8", bg: "rgba(243,139,168,0.08)", label: "ERR" },
  warn: { text: "#f9e2af", bg: "rgba(249,226,175,0.08)", label: "WRN" },
  info: { text: "#89b4fa", bg: "rgba(137,180,250,0.05)", label: "INF" },
  debug: { text: "#6c7086", bg: "transparent", label: "DBG" },
  unknown: { text: "#a6adc8", bg: "transparent", label: "---" },
};

const REFRESH_INTERVALS = [
  { label: "Off", value: 0 },
  { label: "1s", value: 1000 },
  { label: "5s", value: 5000 },
  { label: "10s", value: 10000 },
];

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1048576).toFixed(1)}MB`;
}

function parseLine(line: string): ParsedLine {
  const lower = line.toLowerCase();
  let level: ParsedLine["level"] = "unknown";
  if (/\berror\b|\bfatal\b|\bfail/i.test(line)) level = "error";
  else if (/\bwarn/i.test(line)) level = "warn";
  else if (/\binfo\b|\bnotice\b/i.test(line)) level = "info";
  else if (/\bdebug\b|\btrace\b/i.test(line)) level = "debug";

  // Extract timestamp if present
  const tsMatch = line.match(/^\[?(\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}:\d{2})/);
  return { raw: line, level, timestamp: tsMatch?.[1] };
}

export default function LogsPage() {
  const [files, setFiles] = useState<LogFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [logContent, setLogContent] = useState("");
  const [totalLines, setTotalLines] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<Set<string>>(new Set(["error", "warn", "info", "debug", "unknown"]));
  const [autoScroll, setAutoScroll] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/logs")
      .then((r) => r.json())
      .then((d) => { setFiles(d.files || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const loadLog = (name: string) => {
    setSelectedFile(name);
    setLoading(true);
    fetch(`/api/logs?file=${encodeURIComponent(name)}&lines=500`)
      .then((r) => r.json())
      .then((d) => {
        setLogContent(d.content || "");
        setTotalLines(d.totalLines || 0);
        setLoading(false);
        if (autoScroll) {
          setTimeout(() => {
            if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
          }, 100);
        }
      })
      .catch(() => setLoading(false));
  };

  const refresh = () => { if (selectedFile) loadLog(selectedFile); };

  useEffect(() => {
    if (!refreshInterval || !selectedFile) return;
    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, selectedFile]);

  // Parse log lines
  const parsedLines = useMemo(() => {
    if (!logContent) return [];
    return logContent.split("\n").filter(Boolean).map(parseLine);
  }, [logContent]);

  // Filter lines
  const filteredLines = useMemo(() => {
    return parsedLines.filter(line => {
      if (!levelFilter.has(line.level)) return false;
      if (searchQuery && !line.raw.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [parsedLines, levelFilter, searchQuery]);

  // Level counts
  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { error: 0, warn: 0, info: 0, debug: 0, unknown: 0 };
    parsedLines.forEach(l => counts[l.level]++);
    return counts;
  }, [parsedLines]);

  const toggleLevel = (level: string) => {
    setLevelFilter(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

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
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Filter logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-8 py-1.5 rounded-lg text-xs w-48"
                style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Refresh interval */}
            <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
              {REFRESH_INTERVALS.map(ri => (
                <button
                  key={ri.value}
                  onClick={() => setRefreshInterval(ri.value)}
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: refreshInterval === ri.value ? "var(--accent)" : "transparent",
                    color: refreshInterval === ri.value ? "white" : "var(--text-muted)",
                    border: "none", cursor: "pointer",
                  }}
                >
                  {ri.label}
                </button>
              ))}
            </div>

            <button
              onClick={refresh}
              className="p-2 rounded-lg"
              style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              <RefreshCw className="w-4 h-4" />
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
                    border: "none", cursor: "pointer",
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
                {/* Header with level filters */}
                <div className="px-4 py-3 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <ScrollText className="w-4 h-4" style={{ color: "var(--accent)" }} />
                    <span className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>{selectedFile}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)" }}>
                      {filteredLines.length}/{totalLines} lines
                    </span>
                    {refreshInterval > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3B82F6" }}>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" /> Auto {refreshInterval/1000}s
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {Object.entries(LEVEL_COLORS).filter(([k]) => k !== "unknown").map(([level, config]) => (
                      <button
                        key={level}
                        onClick={() => toggleLevel(level)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-mono font-bold transition-opacity"
                        style={{
                          backgroundColor: levelFilter.has(level) ? config.bg : "transparent",
                          color: levelFilter.has(level) ? config.text : "var(--text-muted)",
                          opacity: levelFilter.has(level) ? 1 : 0.4,
                          border: `1px solid ${levelFilter.has(level) ? config.text + "40" : "transparent"}`,
                          cursor: "pointer",
                        }}
                      >
                        {config.label} <span style={{ fontWeight: 400 }}>{levelCounts[level]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Log lines */}
                <div
                  ref={logRef}
                  className="overflow-auto font-mono text-xs leading-5"
                  style={{ maxHeight: "70vh", backgroundColor: "#0A0A0F" }}
                >
                  {loading ? (
                    <div className="p-4" style={{ color: "var(--text-muted)" }}>Loading...</div>
                  ) : filteredLines.length === 0 ? (
                    <div className="p-8 text-center" style={{ color: "var(--text-muted)" }}>
                      {searchQuery ? `No lines matching "${searchQuery}"` : "No log entries"}
                    </div>
                  ) : (
                    filteredLines.map((line, i) => {
                      const config = LEVEL_COLORS[line.level];
                      return (
                        <div
                          key={i}
                          className="flex hover:opacity-100 transition-opacity"
                          style={{
                            backgroundColor: config.bg,
                            borderLeft: `3px solid ${line.level === "unknown" ? "transparent" : config.text}`,
                            opacity: line.level === "debug" ? 0.6 : 1,
                          }}
                        >
                          {/* Line number */}
                          <span
                            className="shrink-0 px-2 py-0.5 text-right select-none"
                            style={{ width: "45px", color: "var(--text-muted)", opacity: 0.4, borderRight: "1px solid #1a1a2e" }}
                          >
                            {i + 1}
                          </span>
                          {/* Content */}
                          <pre
                            className="flex-1 px-3 py-0.5"
                            style={{
                              color: config.text,
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                            }}
                          >
                            {searchQuery ? highlightSearch(line.raw, searchQuery) : line.raw}
                          </pre>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 flex items-center justify-between" style={{ borderTop: "1px solid var(--border)", backgroundColor: "#0A0A0F" }}>
                  <div className="flex items-center gap-3">
                    {Object.entries(levelCounts).filter(([k]) => k !== "unknown").map(([level, count]) => (
                      <span key={level} className="text-xs font-mono" style={{ color: LEVEL_COLORS[level].text }}>
                        {LEVEL_COLORS[level].label}: {count}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                    style={{ color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none" }}
                  >
                    <ArrowDown className="w-3 h-3" /> Bottom
                  </button>
                </div>
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

function highlightSearch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} style={{ backgroundColor: "rgba(59,130,246,0.3)", color: "inherit", borderRadius: "2px", padding: "0 2px" }}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}
