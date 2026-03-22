"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface GraphNode {
  id: string;
  label: string;
  size: number;
  color: string;
  type: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: { totalFiles: number; totalLinks: number; totalSize: number };
}

// Simple force-directed layout
function forceLayout(nodes: GraphNode[], edges: GraphEdge[], width: number, height: number, iterations = 100) {
  // Initialize positions
  nodes.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const r = Math.min(width, height) * 0.35;
    n.x = width / 2 + r * Math.cos(angle);
    n.y = height / 2 + r * Math.sin(angle);
    n.vx = 0;
    n.vy = 0;
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const repulsion = 800 * alpha;
    const attraction = 0.02 * alpha;

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = (b.x || 0) - (a.x || 0);
        const dy = (b.y || 0) - (a.y || 0);
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx! -= fx; a.vy! -= fy;
        b.vx! += fx; b.vy! += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;
      const dx = (b.x || 0) - (a.x || 0);
      const dy = (b.y || 0) - (a.y || 0);
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = dist * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx! += fx; a.vy! += fy;
      b.vx! -= fx; b.vy! -= fy;
    }

    // Center gravity
    for (const n of nodes) {
      n.vx! += (width / 2 - (n.x || 0)) * 0.01 * alpha;
      n.vy! += (height / 2 - (n.y || 0)) * 0.01 * alpha;
    }

    // Apply velocities with damping
    for (const n of nodes) {
      n.vx! *= 0.85;
      n.vy! *= 0.85;
      n.x = Math.max(30, Math.min(width - 30, (n.x || 0) + (n.vx || 0)));
      n.y = Math.max(30, Math.min(height - 30, (n.y || 0) + (n.vy || 0)));
    }
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function MemoryGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const nodesRef = useRef<GraphNode[]>([]);

  useEffect(() => {
    fetch("/api/memory/graph")
      .then((r) => r.json())
      .then((d: GraphData) => {
        setData(d);
        nodesRef.current = d.nodes;
      })
      .catch(console.error);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Layout if not done
    if (!data.nodes[0]?.x) {
      forceLayout(data.nodes, data.edges, w, h);
    }

    // Clear
    ctx.fillStyle = "rgba(10, 10, 15, 0.95)";
    ctx.fillRect(0, 0, w, h);

    // Draw edges
    const nodeMap = new Map(data.nodes.map((n) => [n.id, n]));
    ctx.strokeStyle = "rgba(100, 120, 160, 0.15)";
    ctx.lineWidth = 1;
    for (const edge of data.edges) {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) continue;

      const isHovered = hoveredNode && (hoveredNode.id === a.id || hoveredNode.id === b.id);
      ctx.strokeStyle = isHovered ? "rgba(180, 190, 254, 0.5)" : "rgba(100, 120, 160, 0.15)";
      ctx.lineWidth = isHovered ? 2 : 1;

      ctx.beginPath();
      ctx.moveTo(a.x || 0, a.y || 0);
      ctx.lineTo(b.x || 0, b.y || 0);
      ctx.stroke();
    }

    // Draw nodes
    for (const node of data.nodes) {
      const isHovered = hoveredNode?.id === node.id;
      const radius = (node.size || 4) * (isHovered ? 1.5 : 1);

      // Glow
      if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x || 0, node.y || 0, radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = node.color + "30";
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(node.x || 0, node.y || 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = isHovered ? node.color : node.color + "CC";
      ctx.fill();

      // Label for larger or hovered nodes
      if (node.size > 6 || isHovered) {
        ctx.font = `${isHovered ? "12px" : "10px"} system-ui, sans-serif`;
        ctx.fillStyle = isHovered ? "#fff" : "rgba(200, 210, 230, 0.7)";
        ctx.textAlign = "center";
        ctx.fillText(node.label, node.x || 0, (node.y || 0) + radius + 14);
      }
    }
  }, [data, hoveredNode]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas || !data) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setMousePos({ x: e.clientX, y: e.clientY });

      let found: GraphNode | null = null;
      for (const node of data.nodes) {
        const dx = (node.x || 0) - mx;
        const dy = (node.y || 0) - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < (node.size || 4) + 5) {
          found = node;
          break;
        }
      }
      if (found?.id !== hoveredNode?.id) {
        setHoveredNode(found);
      }
    },
    [data, hoveredNode]
  );

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[500px]" style={{ color: "var(--text-muted)" }}>
        <div className="animate-pulse">Loading knowledge graph...</div>
      </div>
    );
  }

  // Legend items
  const legendItems = [
    { color: "#f38ba8", label: "MEMORY.md" },
    { color: "#fab387", label: "context.md" },
    { color: "#a6e3a1", label: "decisions.md" },
    { color: "#94e2d5", label: "memory/" },
    { color: "#89b4fa", label: "life/" },
    { color: "#f9e2af", label: "plans/" },
    { color: "#cba6f7", label: "skills/" },
    { color: "#b4befe", label: "Other .md" },
  ];

  return (
    <div style={{ position: "relative" }}>
      {/* Stats bar */}
      <div
        className="flex items-center gap-6 mb-4 px-4 py-2"
        style={{ backgroundColor: "var(--surface)", borderRadius: 8 }}
      >
        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          <strong style={{ color: "var(--text-primary)" }}>{data.stats.totalFiles}</strong> files
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          <strong style={{ color: "var(--text-primary)" }}>{data.stats.totalLinks}</strong> connections
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
          <strong style={{ color: "var(--text-primary)" }}>{formatBytes(data.stats.totalSize)}</strong> total
        </div>
        <div className="flex items-center gap-3 ml-auto" style={{ fontSize: 11 }}>
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
              <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: "100%",
          height: "500px",
          borderRadius: 12,
          cursor: hoveredNode ? "pointer" : "default",
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
      />

      {/* Tooltip */}
      {hoveredNode && (
        <div
          style={{
            position: "fixed",
            left: mousePos.x + 16,
            top: mousePos.y - 10,
            backgroundColor: "var(--surface-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            zIndex: 100,
            pointerEvents: "none",
            maxWidth: 250,
          }}
        >
          <div style={{ fontWeight: 600, color: hoveredNode.color, marginBottom: 2 }}>{hoveredNode.label}</div>
          <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{hoveredNode.id}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 2 }}>
            Category: {hoveredNode.type}
          </div>
        </div>
      )}
    </div>
  );
}
