import { create } from "zustand";

// ---- Types ----
interface Agent {
  id: string;
  name: string;
  emoji: string;
  model: string;
  status: string;
  color: string;
}

interface SystemStats {
  cpu: number;
  ram: { used: number; total: number; percent: number };
  uptime: string;
  loadAvg: number[];
}

interface SessionSummary {
  active: number;
  total: number;
  totalTokens: number;
  models: number;
}

interface CronSummary {
  total: number;
  active: number;
  nextRun: string | null;
}

interface NotificationState {
  unreadCount: number;
  criticalCount: number;
}

// ---- Store ----
interface AppStore {
  // Agents
  agents: Agent[];
  setAgents: (agents: Agent[]) => void;

  // System
  system: SystemStats | null;
  setSystem: (system: SystemStats) => void;

  // Sessions
  sessions: SessionSummary;
  setSessions: (sessions: SessionSummary) => void;

  // Crons
  crons: CronSummary;
  setCrons: (crons: CronSummary) => void;

  // Notifications
  notifications: NotificationState;
  setNotifications: (n: NotificationState) => void;

  // SSE connected
  sseConnected: boolean;
  setSseConnected: (connected: boolean) => void;

  // Active tab tracking
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Theme
  theme: "dark" | "light";
  toggleTheme: () => void;

  // Search
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Last fetched timestamps (avoid re-fetching)
  lastFetched: Record<string, number>;
  markFetched: (key: string) => void;
  shouldRefetch: (key: string, maxAgeMs?: number) => boolean;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Agents
  agents: [],
  setAgents: (agents) => set({ agents }),

  // System
  system: null,
  setSystem: (system) => set({ system }),

  // Sessions
  sessions: { active: 0, total: 0, totalTokens: 0, models: 0 },
  setSessions: (sessions) => set({ sessions }),

  // Crons
  crons: { total: 0, active: 0, nextRun: null },
  setCrons: (crons) => set({ crons }),

  // Notifications
  notifications: { unreadCount: 0, criticalCount: 0 },
  setNotifications: (notifications) => set({ notifications }),

  // SSE
  sseConnected: false,
  setSseConnected: (sseConnected) => set({ sseConnected }),

  // Active tab
  activeTab: "/hub",
  setActiveTab: (activeTab) => set({ activeTab }),

  // Theme
  theme: "dark",
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

  // Search
  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Caching
  lastFetched: {},
  markFetched: (key) =>
    set((s) => ({ lastFetched: { ...s.lastFetched, [key]: Date.now() } })),
  shouldRefetch: (key, maxAgeMs = 30000) => {
    const last = get().lastFetched[key];
    return !last || Date.now() - last > maxAgeMs;
  },
}));
