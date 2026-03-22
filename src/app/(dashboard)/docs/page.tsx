"use client";

import { useEffect, useState } from "react";
import { FolderOpen, FileText, Book, ExternalLink } from "lucide-react";

interface DocFile {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  modified: string;
}

export default function DocsPage() {
  const [files, setFiles] = useState<DocFile[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reuse the memory browser API to browse workspace root
    fetch("/api/memory?browse=")
      .then((r) => r.json())
      .then((d) => {
        // Filter to show docs-relevant files
        const entries = (d.entries || []).filter((e: DocFile) => {
          if (e.type === "dir") return ["plans", "docs", "life", "config", "scripts", "skills", "projects"].includes(e.name);
          return e.name.endsWith(".md") || e.name.endsWith(".txt") || e.name.endsWith(".json");
        });
        setFiles(entries);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  const externalDocs = [
    { label: "OpenClaw Docs", url: "https://docs.openclaw.ai", emoji: "📖" },
    { label: "GitHub Repo", url: "https://github.com/openclaw/openclaw", emoji: "🐙" },
    { label: "Community Discord", url: "https://discord.com/invite/clawd", emoji: "💬" },
    { label: "Skill Hub", url: "https://clawhub.com", emoji: "🧩" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Docs / Files
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Workspace documentation and reference files
        </p>
      </div>

      {/* External links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {externalDocs.map((doc) => (
          <a
            key={doc.url}
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl transition-colors"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <span style={{ fontSize: "20px" }}>{doc.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{doc.label}</div>
            </div>
            <ExternalLink className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
          </a>
        ))}
      </div>

      {/* File content view */}
      {fileContent !== null ? (
        <div className="space-y-3">
          <button
            onClick={() => setFileContent(null)}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg"
            style={{ color: "var(--accent)", backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            ← Back
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
        <div className="rounded-xl" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
            <FolderOpen className="w-4 h-4" style={{ color: "var(--accent)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Workspace Files</span>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {files.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => f.type === "file" ? openFile(f.path) : null}
                    className="flex items-center gap-3 p-3 rounded-lg text-left transition-colors"
                    style={{ backgroundColor: "transparent" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-elevated)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    {f.type === "dir" ? (
                      <Book className="w-5 h-5 shrink-0" style={{ color: "var(--warning)" }} />
                    ) : (
                      <FileText className="w-5 h-5 shrink-0" style={{ color: "var(--text-muted)" }} />
                    )}
                    <div>
                      <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{f.name}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {f.type === "dir" ? "Folder" : `${(f.size / 1024).toFixed(1)}KB`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
