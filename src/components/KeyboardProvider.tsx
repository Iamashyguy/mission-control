"use client";

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();
  return <>{children}</>;
}
