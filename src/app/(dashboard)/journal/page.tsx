"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  BookOpen,
  Calendar,
  FileText,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hash,
  ArrowLeft,
} from "lucide-react";

interface JournalEntry {
  date: string;
  dayOfWeek: string;
  size: string;
  lines: number;
  sections: number;
  sectionNames: string[];
  preview: string;
  lastModified: string;
}

interface JournalDetail {
  date: string;
  content: string;
  size: string;
  lastModified: string;
  sections: Array<{ title: string; lineCount: number }>;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detail, setDetail] = useState<JournalDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch("/api/journal")
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.entries || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openEntry = async (date: string) => {
    setSelectedDate(date);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/journal?date=${date}`);
      const d = await res.json();
      setDetail(d);
    } catch {}
    setDetailLoading(false);
  };

  const goBack = () => {
    setSelectedDate(null);
    setDetail(null);
  };

  // Navigate between entries
  const navigateEntry = (direction: -1 | 1) => {
    if (!selectedDate) return;
    const idx = entries.findIndex((e) => e.date === selectedDate);
    const newIdx = idx + direction;
    if (newIdx >= 0 && newIdx < entries.length) {
      openEntry(entries[newIdx].date);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Daily Journal
        </h1>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="h-4 rounded w-1/3 mb-2" style={{ backgroundColor: "var(--border)" }} />
              <div className="h-3 rounded w-2/3" style={{ backgroundColor: "var(--border)" }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Detail View
  if (selectedDate && detail) {
    const currentIdx = entries.findIndex((e) => e.date === selectedDate);
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 rounded-lg transition-colors"
              style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)" }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
                {new Date(detail.date + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                {detail.size} · {detail.sections.length} sections · Last modified: {new Date(detail.lastModified).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateEntry(1)}
              disabled={currentIdx >= entries.length - 1}
              className="p-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)" }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigateEntry(-1)}
              disabled={currentIdx <= 0}
              className="p-2 rounded-lg transition-colors disabled:opacity-30"
              style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)" }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section Index */}
        {detail.sections.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {detail.sections.map((s) => (
              <span
                key={s.title}
                className="px-3 py-1 rounded-lg text-xs font-medium"
                style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
              >
                {s.title} ({s.lineCount} lines)
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div
          className="rounded-xl p-6"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <pre
            className="whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-body)" }}
          >
            {detail.content}
          </pre>
        </div>
      </div>
    );
  }

  // Detail loading
  if (selectedDate && detailLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>Loading journal entry...</div>
      </div>
    );
  }

  // List View
  const today = new Date().toISOString().split("T")[0];
  const thisWeek = entries.filter((e) => {
    const diff = (new Date(today).getTime() - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24);
    return diff < 7;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
          Daily Journal
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Auto-logged daily memory files from agent conversations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Total Entries"
          value={total}
          icon={<BookOpen />}
          iconColor="var(--accent)"
          subtitle={`${thisWeek.length} this week`}
        />
        <StatsCard
          title="Latest Entry"
          value={entries[0]?.date || "None"}
          icon={<Calendar />}
          iconColor="var(--positive)"
          subtitle={entries[0]?.dayOfWeek || ""}
        />
        <StatsCard
          title="Total Lines"
          value={entries.reduce((sum, e) => sum + e.lines, 0).toLocaleString()}
          icon={<FileText />}
          iconColor="var(--info)"
          subtitle="Across all entries"
        />
      </div>

      {/* Entry List */}
      <div className="space-y-2">
        {entries.map((entry) => {
          const isToday = entry.date === today;
          return (
            <button
              key={entry.date}
              onClick={() => openEntry(entry.date)}
              className="w-full text-left rounded-xl p-4 transition-all"
              style={{
                backgroundColor: "var(--card)",
                border: `1px solid ${isToday ? "var(--accent)" : "var(--border)"}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; }}
              onMouseLeave={(e) => { if (!isToday) e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: isToday ? "var(--accent-soft)" : "var(--surface-elevated)" }}
                  >
                    <span className="text-sm font-bold" style={{ color: isToday ? "var(--accent)" : "var(--text-muted)", fontFamily: "var(--font-heading)" }}>
                      {new Date(entry.date + "T12:00:00").getDate()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                        {entry.dayOfWeek}, {entry.date}
                      </span>
                      {isToday && <span className="badge badge-success">Today</span>}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {entry.preview || "No preview available"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {entry.lines} lines
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {entry.size}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {entry.sections} sections
                  </span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              {/* Section tags */}
              {entry.sectionNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 ml-13">
                  {entry.sectionNames.slice(0, 5).map((s) => (
                    <span
                      key={s}
                      className="px-2 py-0.5 rounded text-xs"
                      style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-muted)" }}
                    >
                      {s}
                    </span>
                  ))}
                  {entry.sectionNames.length > 5 && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      +{entry.sectionNames.length - 5} more
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}

        {entries.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No journal entries yet</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Entries are auto-created from daily memory files
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
