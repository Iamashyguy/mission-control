"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";

const SHORTCUTS: Record<string, string> = {
  h: "/hub",
  a: "/agents",
  s: "/sessions",
  c: "/crons",
  m: "/memory",
  t: "/tasks",
  g: "/git",
  l: "/logs",
  d: "/discover",
  o: "/office3d",
};

export function useKeyboardShortcuts() {
  const router = useRouter();
  const { setSearchOpen, searchOpen } = useAppStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if typing in input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // ⌘K or Ctrl+K → Search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
        return;
      }

      // Escape → Close search
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false);
        return;
      }

      // Alt+<key> → Navigation shortcuts
      if (e.altKey && SHORTCUTS[e.key]) {
        e.preventDefault();
        router.push(SHORTCUTS[e.key]);
        return;
      }

      // ? → Show shortcuts help (only if no modifier)
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Could show a modal — for now just log
        console.log("Keyboard shortcuts: Alt+H=Hub, Alt+A=Agents, Alt+S=Sessions, Alt+C=Crons, Alt+M=Memory, Alt+T=Tasks, Alt+G=Git, Alt+L=Logs, ⌘K=Search");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router, setSearchOpen, searchOpen]);
}
