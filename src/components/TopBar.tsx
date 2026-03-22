"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, Command, FileText, Brain, Clock } from "lucide-react";

export function TopBar() {
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch]);

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          left: "var(--sidebar-width)",
          right: 0,
          height: "var(--topbar-height)",
          backgroundColor: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          zIndex: 45,
        }}
      >
        {/* Left: Breadcrumb area */}
        <div className="flex items-center gap-3">
          <span style={{ fontSize: "16px" }}>⚡</span>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            Ashish&apos;s Command Center
          </span>
        </div>

        {/* Right: Search + Notifications */}
        <div className="flex items-center gap-3">
          {/* Search trigger */}
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2"
            style={{
              width: "220px",
              height: "32px",
              backgroundColor: "var(--surface-elevated)",
              borderRadius: "6px",
              padding: "0 12px",
              border: "1px solid var(--border)",
            }}
          >
            <Search style={{ width: "14px", height: "14px", color: "var(--text-muted)" }} />
            <span style={{ fontSize: "12px", color: "var(--text-muted)", flex: 1, textAlign: "left" }}>
              Search...
            </span>
            <kbd
              className="flex items-center gap-0.5"
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
                backgroundColor: "var(--card)",
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
              }}
            >
              <Command style={{ width: "10px", height: "10px" }} />K
            </kbd>
          </button>

          {/* Notification bell */}
          <button
            className="relative p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <Bell style={{ width: "18px", height: "18px" }} />
            {/* Unread dot */}
            <div
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--accent)",
                border: "2px solid var(--surface)",
              }}
            />
          </button>

          {/* User avatar */}
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "14px",
              backgroundColor: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "12px",
                fontWeight: 700,
                color: "white",
              }}
            >
              A
            </span>
          </div>
        </div>
      </div>

      {/* Search Modal */}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </>
  );
}

interface SearchResult {
  title: string;
  type: string;
  path: string;
  snippet: string;
  icon: string;
}

function SearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results || []);
      setSelected(0);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, search]);

  const navigate = (path: string) => { onClose(); router.push(path); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && results[selected]) { navigate(results[selected].path); }
  };

  const TYPE_ICONS: Record<string, React.ReactNode> = {
    page: <Clock className="w-4 h-4" />,
    memory: <Brain className="w-4 h-4" />,
    file: <FileText className="w-4 h-4" />,
    setting: <Search className="w-4 h-4" />,
    cron: <Clock className="w-4 h-4" />,
  };

  const TYPE_COLORS: Record<string, string> = {
    page: "var(--accent)", memory: "var(--positive)", file: "var(--info)",
    setting: "var(--warning)", cron: "var(--text-muted)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "90%", maxWidth: "42rem", backgroundColor: "var(--card)",
        border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden",
        boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
      }}>
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <Search style={{ width: "18px", height: "18px", color: "var(--text-muted)" }} />
          <input type="text" placeholder="Search pages, memory, files, settings..."
            autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }} />
          {loading && <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />}
          <kbd style={{ fontSize: "10px", color: "var(--text-muted)", backgroundColor: "var(--surface-elevated)", padding: "2px 8px", borderRadius: "4px" }}>ESC</kbd>
        </div>

        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          {results.length > 0 ? (
            <div className="p-2">
              {results.map((r, i) => (
                <button key={`${r.type}-${r.path}-${i}`} onClick={() => navigate(r.path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                  style={{ backgroundColor: i === selected ? "var(--surface-elevated)" : "transparent" }}
                  onMouseEnter={() => setSelected(i)}>
                  <span className="flex-shrink-0" style={{ color: TYPE_COLORS[r.type] || "var(--text-muted)" }}>
                    {r.icon ? <span style={{ fontSize: "16px" }}>{r.icon}</span> : TYPE_ICONS[r.type]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{r.title}</div>
                    <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{r.snippet}</div>
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: "var(--surface-elevated)", color: TYPE_COLORS[r.type] || "var(--text-muted)" }}>
                    {r.type}
                  </span>
                </button>
              ))}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="p-8 text-center">
              <Search className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No results for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Type at least 2 characters to search across pages, memory files, workspace docs, and settings</p>
              <div className="flex items-center justify-center gap-4 mt-3">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>↑↓ Navigate</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>↵ Open</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Esc Close</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
