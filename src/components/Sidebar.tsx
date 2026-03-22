"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  DollarSign,
  Search as SearchIcon,
  FolderOpen,
  Timer,
  Activity,
  Brain,
  History,
  ScrollText,
  Settings,
  Puzzle,
  SquareTerminal,
  Shield,
  GitFork,
  Workflow,
  Gamepad2,
  Mail,
  Wallet,
  Building2,
  BookOpen,
  BarChart3,
  Youtube,
  Calendar,
  Bell,
  HardDrive,
  LogOut,
  Menu,
  X,
  Compass,
  Terminal,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  phase: number; // 1, 2, or 3
  enabled: boolean;
}

const navItems: NavItem[] = [
  // Phase 1 — Core
  { href: "/hub", label: "Hub", icon: LayoutDashboard, phase: 1, enabled: true },
  { href: "/agents", label: "Agents & System", icon: Bot, phase: 1, enabled: true },
  { href: "/costs", label: "Cost Tracker", icon: DollarSign, phase: 1, enabled: true },
  { href: "/discover", label: "Discover Sites", icon: Compass, phase: 1, enabled: true },
  { href: "/docs", label: "Docs / Files", icon: FolderOpen, phase: 1, enabled: true },
  { href: "/crons", label: "Cron Manager", icon: Timer, phase: 1, enabled: true },
  { href: "/activity", label: "Activity Feed", icon: Activity, phase: 1, enabled: true },
  { href: "/memory", label: "Memory Browser", icon: Brain, phase: 1, enabled: true },
  { href: "/sessions", label: "Sessions", icon: History, phase: 1, enabled: true },
  { href: "/logs", label: "Logs", icon: ScrollText, phase: 1, enabled: true },
  // Phase 2
  { href: "/email", label: "Email Hub", icon: Mail, phase: 2, enabled: true },
  { href: "/finance", label: "Finance", icon: Wallet, phase: 2, enabled: true },
  { href: "/compliance", label: "Compliance", icon: Building2, phase: 2, enabled: true },
  { href: "/journal", label: "Daily Journal", icon: BookOpen, phase: 2, enabled: true },
  { href: "/settings", label: "Settings", icon: Settings, phase: 2, enabled: true },
  { href: "/skills", label: "Skills", icon: Puzzle, phase: 2, enabled: true },
  { href: "/terminal", label: "Terminal", icon: SquareTerminal, phase: 2, enabled: true },
  { href: "/backup", label: "Backup Manager", icon: HardDrive, phase: 2, enabled: true },
  // Phase 3
  { href: "/revenue", label: "Revenue", icon: BarChart3, phase: 3, enabled: false },
  { href: "/youtube", label: "YouTube", icon: Youtube, phase: 3, enabled: false },
  { href: "/calendar", label: "Calendar", icon: Calendar, phase: 3, enabled: false },
  { href: "/notifications", label: "Notifications", icon: Bell, phase: 3, enabled: false },
  { href: "/security", label: "Security", icon: Shield, phase: 3, enabled: false },
  { href: "/git", label: "Git / GitHub", icon: GitFork, phase: 3, enabled: false },
  { href: "/workflows", label: "Workflows", icon: Workflow, phase: 3, enabled: false },
  { href: "/office3d", label: "3D Office", icon: Gamepad2, phase: 3, enabled: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) setIsOpen(false);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile) setIsOpen(false);
  }, [pathname, isMobile]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // Group by phase
  const phase1 = navItems.filter((i) => i.phase === 1);
  const phase2 = navItems.filter((i) => i.phase === 2);
  const phase3 = navItems.filter((i) => i.phase === 3);

  const renderNavGroup = (items: NavItem[], label: string) => (
    <div className="mb-4">
      <div
        className="px-4 py-1 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </div>
      <ul className="space-y-0.5 mt-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              {item.enabled ? (
                <Link
                  href={item.href}
                  className={`nav-item w-full ${isActive ? "active" : ""}`}
                >
                  <Icon
                    className="w-5 h-5"
                    style={!isActive ? { color: "var(--text-muted)" } : undefined}
                  />
                  {item.label}
                </Link>
              ) : (
                <div className="nav-item disabled w-full">
                  <Icon className="w-5 h-5" />
                  {item.label}
                  <span className="badge badge-info ml-auto">Soon</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="fixed top-4 left-4 z-60 p-2 rounded-lg"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: "var(--sidebar-width)",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--card)",
          borderRight: "1px solid var(--border)",
          zIndex: 50,
          transform: isMobile ? (isOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
          transition: "transform 0.3s ease",
          overflowY: "auto",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4">
          <Terminal className="w-6 h-6" style={{ color: "var(--accent)" }} />
          <h1
            className="text-base font-bold tracking-tight"
            style={{
              fontFamily: "var(--font-heading)",
              color: "var(--text-primary)",
              letterSpacing: "-0.5px",
            }}
          >
            Mission Control
          </h1>
          {isMobile && (
            <button onClick={() => setIsOpen(false)} className="ml-auto" style={{ color: "var(--text-muted)" }}>
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 px-2 py-2 overflow-y-auto">
          {renderNavGroup(phase1, "Core")}
          {renderNavGroup(phase2, "Business")}
          {renderNavGroup(phase3, "Advanced")}
        </nav>

        {/* Footer */}
        <div className="p-2" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 w-full rounded-lg transition-colors text-sm"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--error)";
              e.currentTarget.style.backgroundColor = "var(--card-elevated)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
