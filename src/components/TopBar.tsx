"use client";

import { useState, useEffect } from "react";
import { Search, Bell, Command } from "lucide-react";

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

      {/* Search Modal (placeholder) */}
      {showSearch && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.8)" }}
          onClick={() => setShowSearch(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: "42rem",
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            <div className="flex items-center gap-3 p-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <Search style={{ width: "18px", height: "18px", color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Search everything..."
                autoFocus
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text-primary)" }}
              />
              <kbd
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted)",
                  backgroundColor: "var(--surface-elevated)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                }}
              >
                ESC
              </kbd>
            </div>
            <div className="p-6 text-center" style={{ color: "var(--text-muted)", fontSize: "14px" }}>
              Global search coming soon...
            </div>
          </div>
        </div>
      )}
    </>
  );
}
