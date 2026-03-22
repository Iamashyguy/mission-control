"use client";

import { useEffect, useState, useRef } from "react";
import { Terminal, Play, Trash2, Clock, ChevronRight } from "lucide-react";

interface CommandResult {
  id: string;
  command: string;
  output: string;
  timestamp: string;
  exitCode: number;
}

interface AllowedCommand {
  name: string;
  description: string;
}

export default function TerminalPage() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<CommandResult[]>([]);
  const [running, setRunning] = useState(false);
  const [commands, setCommands] = useState<AllowedCommand[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/terminal")
      .then((r) => r.json())
      .then((d) => setCommands(d.commands || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const runCommand = async (cmd?: string) => {
    const command = (cmd || input).trim();
    if (!command) return;

    setRunning(true);
    setInput("");
    setShowSuggestions(false);
    setHistoryIndex(-1);

    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();

      if (data.error) {
        setHistory((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            command,
            output: `Error: ${data.error}${data.allowed ? "\n\nAllowed commands:\n" + data.allowed.join("\n") : ""}`,
            timestamp: new Date().toISOString(),
            exitCode: 1,
          },
        ]);
      } else {
        setHistory((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            command: data.command,
            output: data.output,
            timestamp: data.timestamp,
            exitCode: data.exitCode,
          },
        ]);
      }
    } catch {
      setHistory((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          command,
          output: "Failed to connect to terminal API",
          timestamp: new Date().toISOString(),
          exitCode: 1,
        },
      ]);
    }

    setRunning(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const cmds = history.map((h) => h.command);
      if (cmds.length > 0) {
        const newIdx = Math.min(historyIndex + 1, cmds.length - 1);
        setHistoryIndex(newIdx);
        setInput(cmds[cmds.length - 1 - newIdx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIdx = historyIndex - 1;
        const cmds = history.map((h) => h.command);
        setHistoryIndex(newIdx);
        setInput(cmds[cmds.length - 1 - newIdx]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Autocomplete
      const matching = commands.filter((c) => c.name.startsWith(input.toLowerCase()));
      if (matching.length === 1) {
        setInput(matching[0].name);
        setShowSuggestions(false);
      } else if (matching.length > 1) {
        setShowSuggestions(true);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const filteredSuggestions = commands.filter((c) =>
    c.name.includes(input.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Terminal
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Safe, read-only command terminal ({commands.length} allowed commands)
          </p>
        </div>
        <button
          onClick={() => setHistory([])}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors"
          style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)", border: "1px solid var(--border)" }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* Quick Commands */}
      <div className="flex flex-wrap gap-2">
        {["openclaw status", "uptime", "df -h", "pm2 status", "processes", "openclaw doctor"].map((cmd) => (
          <button
            key={cmd}
            onClick={() => runCommand(cmd)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors"
            style={{
              backgroundColor: "var(--surface-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            <Play className="w-3 h-3" />
            {cmd}
          </button>
        ))}
      </div>

      {/* Terminal Output */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "#0D1117", border: "1px solid var(--border)" }}
      >
        {/* Terminal header bar */}
        <div
          className="flex items-center gap-2 px-4 py-2"
          style={{ backgroundColor: "#161B22", borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-1.5">
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#FF5F57" }} />
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#FEBC2E" }} />
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#28C840" }} />
          </div>
          <span className="text-xs ml-2" style={{ color: "#8B949E", fontFamily: "var(--font-mono)" }}>
            mission-control — bash
          </span>
        </div>

        {/* Output area */}
        <div
          ref={outputRef}
          className="p-4 overflow-y-auto"
          style={{ maxHeight: "500px", minHeight: "300px", fontFamily: "var(--font-mono)", fontSize: "13px", lineHeight: "1.6" }}
        >
          {/* Welcome message */}
          <div style={{ color: "#58A6FF" }}>
            ⚡ Mission Control Terminal v1.0
          </div>
          <div style={{ color: "#8B949E", marginBottom: "12px" }}>
            Type a command or click a quick action above. Tab to autocomplete.
          </div>

          {/* Command history */}
          {history.map((entry) => (
            <div key={entry.id} className="mb-3">
              {/* Command line */}
              <div className="flex items-center gap-2">
                <ChevronRight className="w-3.5 h-3.5" style={{ color: "#58A6FF" }} />
                <span style={{ color: "#79C0FF" }}>{entry.command}</span>
                <span className="ml-auto text-xs" style={{ color: "#484F58" }}>
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
              </div>
              {/* Output */}
              <pre
                className="mt-1 pl-5 whitespace-pre-wrap"
                style={{ color: entry.exitCode === 0 ? "#C9D1D9" : "#F85149" }}
              >
                {entry.output}
              </pre>
            </div>
          ))}

          {/* Running indicator */}
          {running && (
            <div className="flex items-center gap-2">
              <ChevronRight className="w-3.5 h-3.5 animate-pulse" style={{ color: "#58A6FF" }} />
              <span className="animate-pulse" style={{ color: "#8B949E" }}>Running...</span>
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          className="relative flex items-center gap-2 px-4 py-3"
          style={{ backgroundColor: "#161B22", borderTop: "1px solid #21262D" }}
        >
          <ChevronRight className="w-4 h-4" style={{ color: "#58A6FF" }} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setShowSuggestions(e.target.value.length > 0); }}
            onKeyDown={handleKeyDown}
            onFocus={() => input.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "#C9D1D9", fontFamily: "var(--font-mono)" }}
            autoFocus
            disabled={running}
          />
          <button
            onClick={() => runCommand()}
            disabled={running || !input.trim()}
            className="px-3 py-1 rounded text-xs font-semibold transition-colors"
            style={{
              backgroundColor: input.trim() ? "var(--accent)" : "#21262D",
              color: input.trim() ? "white" : "#484F58",
            }}
          >
            Run
          </button>

          {/* Autocomplete suggestions */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              className="absolute bottom-full left-0 right-0 mb-1 mx-4 rounded-lg overflow-hidden max-h-48 overflow-y-auto"
              style={{ backgroundColor: "#1C2128", border: "1px solid #30363D", zIndex: 10 }}
            >
              {filteredSuggestions.map((cmd) => (
                <button
                  key={cmd.name}
                  onClick={() => { setInput(cmd.name); setShowSuggestions(false); inputRef.current?.focus(); }}
                  className="w-full flex items-center justify-between px-3 py-2 text-left transition-colors"
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#21262D"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <span className="text-xs font-mono" style={{ color: "#79C0FF" }}>{cmd.name}</span>
                  <span className="text-xs" style={{ color: "#484F58" }}>{cmd.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* All Commands Reference */}
      <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          <Terminal className="w-4 h-4" style={{ color: "var(--accent)" }} />
          Available Commands ({commands.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {commands.map((cmd) => (
            <button
              key={cmd.name}
              onClick={() => runCommand(cmd.name)}
              className="flex items-center justify-between p-2 rounded-lg text-left transition-colors"
              style={{ backgroundColor: "var(--surface-elevated)" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-elevated)"; }}
            >
              <span className="text-xs font-mono" style={{ color: "var(--accent)" }}>{cmd.name}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{cmd.description.slice(0, 30)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
