"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FolderOpen,
  FileText,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  Home,
  LayoutGrid,
  List,
  Search,
  Filter,
  Folder,
  FileCode,
  FileJson,
  Image as ImageIcon,
  File,
  Download,
  Eye,
  ArrowLeft,
  Copy,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { FileTree, type FileNode } from "@/components/FileTree";

// ── Types ────────────────────────────────────────────────────────────────────
interface BrowseItem {
  name: string;
  type: "file" | "folder";
  size: number;
  modified: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function getFileIcon(name: string, type: string) {
  if (type === "folder") return Folder;
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["ts", "tsx", "js", "jsx", "py", "sh"].includes(ext)) return FileCode;
  if (["json", "yaml", "yml", "toml"].includes(ext)) return FileJson;
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return ImageIcon;
  if (["md", "mdx", "txt", "log"].includes(ext)) return FileText;
  return File;
}

function getFileColor(name: string, type: string): string {
  if (type === "folder") return "#F59E0B";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["ts", "tsx"].includes(ext)) return "#60A5FA";
  if (["js", "jsx"].includes(ext)) return "#FCD34D";
  if (["json"].includes(ext)) return "#4ADE80";
  if (["py"].includes(ext)) return "#93C5FD";
  if (["md", "mdx"].includes(ext)) return "#94A3B8";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return "#C084FC";
  return "var(--text-secondary)";
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function isMarkdown(name: string): boolean {
  return name.endsWith(".md") || name.endsWith(".mdx");
}

function renderMarkdownSimple(text: string): string {
  return text
    .replace(/^### (.*$)/gm, '<h3 style="font-size:1.1rem;font-weight:bold;color:var(--text-primary);margin:1rem 0 0.5rem;">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 style="font-size:1.25rem;font-weight:bold;color:var(--text-primary);margin:1.25rem 0 0.5rem;">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 style="font-size:1.5rem;font-weight:bold;color:var(--text-primary);margin:1.5rem 0 0.75rem;">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary);">$1</strong>')
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre style="background:var(--background);padding:0.75rem;border-radius:0.5rem;margin:0.75rem 0;overflow-x:auto;"><code style="color:var(--accent);">$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--background);padding:0.125rem 0.375rem;border-radius:0.25rem;color:var(--accent);">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#60A5FA;" target="_blank">$1</a>')
    .replace(/^\s*[-*] (.*$)/gm, '<li style="margin-left:1rem;list-style-type:disc;">$1</li>')
    .replace(/^> (.*$)/gm, '<blockquote style="border-left:4px solid var(--border);padding-left:1rem;font-style:italic;color:var(--text-secondary);">$1</blockquote>')
    .replace(/\n\n/g, '</p><p style="margin-bottom:0.75rem;">')
    .replace(/\n/g, "<br/>");
}

// ── External Docs ────────────────────────────────────────────────────────────
const externalDocs = [
  { label: "OpenClaw Docs", url: "https://docs.openclaw.ai", emoji: "📖" },
  { label: "GitHub Repo", url: "https://github.com/openclaw/openclaw", emoji: "🐙" },
  { label: "Community Discord", url: "https://discord.com/invite/clawd", emoji: "💬" },
  { label: "Skill Hub", url: "https://clawhub.com", emoji: "🧩" },
];

// ── Category filters ─────────────────────────────────────────────────────────
const FILE_CATEGORIES = [
  { id: "all", label: "All", icon: FolderOpen },
  { id: "docs", label: "Docs", icon: FileText, exts: ["md", "mdx", "txt"] },
  { id: "code", label: "Code", icon: FileCode, exts: ["ts", "tsx", "js", "jsx", "py", "sh"] },
  { id: "config", label: "Config", icon: FileJson, exts: ["json", "yaml", "yml", "toml"] },
  { id: "images", label: "Images", icon: ImageIcon, exts: ["png", "jpg", "jpeg", "gif", "webp", "svg"] },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function DocsPage() {
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState<BrowseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");

  // File preview state
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sidebar tree state
  const [treeNodes, setTreeNodes] = useState<FileNode[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);

  const loadDirectory = useCallback(async (dirPath: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memory?browse=${encodeURIComponent(dirPath)}`);
      const data = await res.json();
      setItems(
        (data.entries || []).map((e: { name: string; path: string; type: string; size: number; modified: string }) => ({
          name: e.name,
          type: e.type === "dir" ? "folder" : "file",
          size: e.size,
          modified: e.modified,
        }))
      );
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  const loadTree = useCallback(async () => {
    try {
      const res = await fetch("/api/memory?browse=");
      const data = await res.json();
      const nodes: FileNode[] = (data.entries || [])
        .filter((e: { type: string; name: string }) => {
          if (e.type === "dir") return ["plans", "docs", "life", "config", "scripts", "skills", "projects", "memory"].includes(e.name);
          return e.name.endsWith(".md") || e.name.endsWith(".txt") || e.name.endsWith(".json");
        })
        .map((e: { name: string; path: string; type: string }) => ({
          name: e.name,
          path: e.path,
          type: e.type === "dir" ? "folder" : "file",
          children: e.type === "dir" ? [] : undefined,
        }));
      setTreeNodes(nodes);
    } catch {
      setTreeNodes([]);
    }
  }, []);

  useEffect(() => {
    loadDirectory(currentPath);
    loadTree();
  }, [currentPath, loadDirectory, loadTree]);

  const openFile = async (filePath: string, fileName: string) => {
    setPreviewLoading(true);
    setPreviewName(fileName);
    setPreviewContent(null);
    try {
      const res = await fetch(`/api/memory?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      setPreviewContent(data.content || "");
    } catch {
      setPreviewContent("Error loading file");
    }
    setPreviewLoading(false);
  };

  const handleCopy = async () => {
    if (previewContent) {
      await navigator.clipboard.writeText(previewContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navigate = (newPath: string) => {
    setCurrentPath(newPath);
    setPreviewContent(null);
    setSearchQuery("");
  };

  // Build breadcrumbs
  const breadcrumbs = currentPath ? currentPath.split("/").filter(Boolean) : [];

  // Filter items
  const filteredItems = items.filter((item) => {
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (category !== "all" && item.type === "file") {
      const cat = FILE_CATEGORIES.find((c) => c.id === category);
      if (cat?.exts) {
        const ext = item.name.split(".").pop()?.toLowerCase() || "";
        if (!cat.exts.includes(ext)) return false;
      }
    }
    return true;
  });

  return (
    <div className="flex h-full" style={{ minHeight: "calc(100vh - var(--topbar-height) - var(--statusbar-height, 0px) - 2rem)" }}>
      {/* ── Sidebar File Tree ── */}
      {showSidebar && (
        <div
          className="hidden md:block shrink-0 overflow-y-auto"
          style={{
            width: "220px",
            borderRight: "1px solid var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div className="px-3 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Explorer
            </span>
          </div>
          <FileTree
            files={treeNodes}
            selectedPath={previewName}
            onSelect={(p) => {
              const node = treeNodes.find((n) => n.path === p);
              if (node?.type === "folder") {
                navigate(p);
              } else {
                const parts = p.split("/");
                const name = parts.pop() || p;
                openFile(p, name);
              }
            }}
          />
        </div>
      )}

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
              Docs / Files
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Browse workspace documentation and reference files
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              {showSidebar ? "Hide" : "Show"} Tree
            </button>
            <button
              onClick={() => { setLoading(true); loadDirectory(currentPath); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* External Links */}
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
              <span className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>{doc.label}</span>
              <ExternalLink className="w-4 h-4 shrink-0" style={{ color: "var(--text-muted)" }} />
            </a>
          ))}
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-sm flex-wrap">
          <button
            onClick={() => navigate("")}
            className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
            style={{ color: currentPath ? "var(--accent)" : "var(--text-primary)", cursor: "pointer", background: "none", border: "none" }}
          >
            <Home className="w-3.5 h-3.5" /> Root
          </button>
          {breadcrumbs.map((crumb, i) => {
            const crumbPath = breadcrumbs.slice(0, i + 1).join("/");
            const isLast = i === breadcrumbs.length - 1;
            return (
              <span key={crumbPath} className="flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                <button
                  onClick={() => !isLast && navigate(crumbPath)}
                  style={{ color: isLast ? "var(--text-primary)" : "var(--accent)", cursor: isLast ? "default" : "pointer", background: "none", border: "none", fontWeight: isLast ? 600 : 400 }}
                >
                  {crumb}
                </button>
              </span>
            );
          })}
        </div>

        {/* Toolbar: Search + Filter + View */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Filter files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none" }}
            />
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            {FILE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  backgroundColor: category === cat.id ? "var(--accent)" : "transparent",
                  color: category === cat.id ? "white" : "var(--text-secondary)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 rounded-lg p-0.5" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <button
              onClick={() => setViewMode("list")}
              className="p-1.5 rounded-md"
              style={{ backgroundColor: viewMode === "list" ? "var(--accent)" : "transparent", color: viewMode === "list" ? "white" : "var(--text-secondary)", border: "none", cursor: "pointer" }}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className="p-1.5 rounded-md"
              style={{ backgroundColor: viewMode === "grid" ? "var(--accent)" : "transparent", color: viewMode === "grid" ? "white" : "var(--text-secondary)", border: "none", cursor: "pointer" }}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* File Preview Panel */}
        {previewContent !== null && (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <button onClick={() => setPreviewContent(null)} className="p-1 rounded-md" style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <FileText className="w-4 h-4" style={{ color: "var(--accent)" }} />
                <span className="text-sm font-mono font-medium" style={{ color: "var(--text-primary)" }}>{previewName}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCopy} className="p-1.5 rounded-md" style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }} title="Copy">
                  {copied ? <Check className="w-4 h-4" style={{ color: "var(--accent)" }} /> : <Copy className="w-4 h-4" />}
                </button>
                <button onClick={() => setPreviewContent(null)} className="p-1.5 rounded-md" style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto max-h-[60vh]">
              {previewLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--accent)" }} />
                </div>
              ) : isMarkdown(previewName) ? (
                <div
                  className="prose prose-invert max-w-none text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                  dangerouslySetInnerHTML={{ __html: `<p>${renderMarkdownSimple(previewContent)}</p>` }}
                />
              ) : (
                <pre className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {previewContent}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* Directory Content */}
        {previewContent === null && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-40" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {searchQuery ? `No files matching "${searchQuery}"` : "Empty directory"}
                </p>
              </div>
            ) : viewMode === "list" ? (
              /* ── List View ── */
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
                {/* Header row */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2.5 text-xs font-medium" style={{ backgroundColor: "var(--background)", color: "var(--text-muted)" }}>
                  <div className="col-span-6">Name</div>
                  <div className="col-span-2">Size</div>
                  <div className="col-span-3">Modified</div>
                  <div className="col-span-1"></div>
                </div>
                {filteredItems.map((item) => {
                  const Icon = getFileIcon(item.name, item.type);
                  const iconColor = getFileColor(item.name, item.type);
                  const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                  return (
                    <div
                      key={item.name}
                      className="flex md:grid md:grid-cols-12 gap-2 md:gap-4 px-4 md:px-6 py-2.5 cursor-pointer transition-colors group"
                      style={{ borderBottom: "1px solid var(--border)" }}
                      onClick={() => item.type === "folder" ? navigate(itemPath) : openFile(itemPath, item.name)}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-elevated)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <div className="md:col-span-6 flex items-center gap-3 min-w-0 flex-1">
                        <Icon className="w-4 h-4 shrink-0" style={{ color: iconColor }} />
                        <span className="truncate text-sm" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                      </div>
                      <div className="md:col-span-2 text-xs flex items-center" style={{ color: "var(--text-secondary)" }}>
                        {item.type === "folder" ? "—" : formatSize(item.size)}
                      </div>
                      <div className="hidden md:col-span-3 md:flex items-center text-xs" style={{ color: "var(--text-secondary)" }}>
                        {formatDate(item.modified)}
                      </div>
                      <div className="md:col-span-1 flex items-center justify-end">
                        {item.type === "file" && (
                          <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60" style={{ color: "var(--text-muted)" }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Grid View ── */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredItems.map((item) => {
                  const Icon = getFileIcon(item.name, item.type);
                  const iconColor = getFileColor(item.name, item.type);
                  const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                  return (
                    <div
                      key={item.name}
                      onClick={() => item.type === "folder" ? navigate(itemPath) : openFile(itemPath, item.name)}
                      className="flex flex-col items-center p-4 rounded-xl cursor-pointer transition-all group"
                      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
                    >
                      <Icon className="w-10 h-10 mb-2 group-hover:scale-110 transition-transform" style={{ color: iconColor }} />
                      <span className="text-xs text-center truncate w-full" style={{ color: "var(--text-primary)" }} title={item.name}>
                        {item.name}
                      </span>
                      <span className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                        {item.type === "folder" ? "Folder" : formatSize(item.size)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
