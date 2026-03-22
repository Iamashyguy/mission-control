"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Timer,
  Building2,
  Cpu,
  FileText,
  RefreshCw,
} from "lucide-react";

interface CalEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: "cron" | "compliance" | "content" | "system" | "personal";
  color: string;
  recurring: boolean;
  source: string;
  details?: string;
}

interface CalendarData {
  month: string;
  events: CalEvent[];
  totalEvents: number;
  categories: Record<string, number>;
  daysInMonth: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  cron: "#3B82F6",
  compliance: "#FF453A",
  system: "#FFD60A",
  content: "#32D74B",
  personal: "#A855F7",
};

const CATEGORY_LABELS: Record<string, string> = {
  cron: "Cron Jobs",
  compliance: "Compliance",
  system: "System",
  content: "Content",
  personal: "Personal",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CalendarPage() {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [view, setView] = useState<"month" | "week">("month");

  const fetchData = (month: string) => {
    setLoading(true);
    fetch(`/api/calendar?month=${month}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(currentMonth); }, [currentMonth]);

  const navigateMonth = (direction: -1 | 1) => {
    const [y, m] = currentMonth.split("-").map(Number);
    const newDate = new Date(y, m - 1 + direction, 1);
    setCurrentMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`);
    setSelectedDate(null);
  };

  const [year, month] = currentMonth.split("-").map(Number);
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = data?.daysInMonth || new Date(year, month, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const filteredEvents = data?.events.filter((e) => filter === "all" || e.category === filter) || [];

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filteredEvents.filter((e) => e.date === dateStr);
  };

  const selectedEvents = selectedDate ? filteredEvents.filter((e) => e.date === selectedDate) : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            Calendar
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Cron schedules, compliance deadlines, and system events
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Events" value={data?.totalEvents || 0} icon={<Calendar />} iconColor="var(--accent)" subtitle={`${MONTH_NAMES[month - 1]} ${year}`} />
        <StatsCard title="Cron Events" value={data?.categories?.cron || 0} icon={<Timer />} iconColor="#3B82F6" subtitle="Scheduled jobs" />
        <StatsCard title="Compliance" value={data?.categories?.compliance || 0} icon={<Building2 />} iconColor="#FF453A" subtitle="Filing deadlines" />
        <StatsCard title="System" value={data?.categories?.system || 0} icon={<Cpu />} iconColor="#FFD60A" subtitle="Billing & renewals" />
      </div>

      {/* Filter + Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {["all", "cron", "compliance", "system"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors"
              style={{
                backgroundColor: filter === f ? (f === "all" ? "var(--accent-soft)" : `${CATEGORY_COLORS[f]}20`) : "var(--surface-elevated)",
                color: filter === f ? (f === "all" ? "var(--accent)" : CATEGORY_COLORS[f]) : "var(--text-muted)",
                border: `1px solid ${filter === f ? (f === "all" ? "var(--accent)" : CATEGORY_COLORS[f]) : "var(--border)"}`,
              }}
            >
              {f === "all" ? "All" : CATEGORY_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigateMonth(-1)} className="p-1.5 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)" }}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-base font-semibold min-w-[160px] text-center" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button onClick={() => navigateMonth(1)} className="p-1.5 rounded-lg" style={{ backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)" }}>
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(["month", "week"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="px-3 py-1.5 text-xs font-semibold capitalize"
                style={{ backgroundColor: view === v ? "var(--accent)" : "var(--surface-elevated)", color: view === v ? "var(--bg)" : "var(--text-muted)" }}>
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => { const n = new Date(); setCurrentMonth(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`); }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ backgroundColor: "var(--accent-soft)", color: "var(--accent)" }}
          >
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        {view === "month" ? (
        <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          {/* Day Headers */}
          <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--border)" }}>
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Cells */}
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] p-1" style={{ backgroundColor: "var(--surface)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }} />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = getEventsForDay(day);
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className="min-h-[80px] p-1.5 text-left transition-colors"
                  style={{
                    backgroundColor: isSelected ? "var(--accent-soft)" : isToday ? "rgba(59,130,246,0.05)" : "transparent",
                    borderRight: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-semibold ${isToday ? "w-6 h-6 rounded-full flex items-center justify-center" : ""}`}
                      style={{
                        color: isToday ? "white" : isSelected ? "var(--accent)" : "var(--text-secondary)",
                        backgroundColor: isToday ? "var(--accent)" : "transparent",
                      }}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{dayEvents.length}</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-xs truncate px-1 py-0.5 rounded"
                        style={{ backgroundColor: `${ev.color}20`, color: ev.color, fontSize: "10px" }}
                      >
                        {ev.title.slice(0, 20)}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs" style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        ) : (
        /* Week View */
        <div className="lg:col-span-2 rounded-xl overflow-hidden" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          {(() => {
            const todayDate = new Date();
            const startOfWeek = new Date(todayDate);
            startOfWeek.setDate(todayDate.getDate() - todayDate.getDay());
            
            return (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {Array.from({ length: 7 }).map((_, di) => {
                  const d = new Date(startOfWeek);
                  d.setDate(startOfWeek.getDate() + di);
                  const dateStr = d.toISOString().split("T")[0];
                  const dayEvts = filteredEvents.filter(e => e.date === dateStr);
                  const isToday = dateStr === today;

                  return (
                    <div key={di} className="flex min-h-[60px]" style={{ backgroundColor: isToday ? "rgba(59,130,246,0.05)" : "transparent" }}>
                      <div className="w-20 shrink-0 p-3 text-center" style={{ borderRight: "1px solid var(--border)" }}>
                        <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                          {DAY_NAMES[d.getDay()]}
                        </div>
                        <div className={`text-lg font-bold ${isToday ? "w-8 h-8 rounded-full flex items-center justify-center mx-auto" : ""}`}
                          style={{ color: isToday ? "white" : "var(--text-primary)", backgroundColor: isToday ? "var(--accent)" : "transparent" }}>
                          {d.getDate()}
                        </div>
                      </div>
                      <div className="flex-1 p-2 flex flex-wrap gap-1">
                        {dayEvts.map(ev => (
                          <div key={ev.id} className="px-2 py-1 rounded text-xs" style={{ backgroundColor: `${ev.color}20`, color: ev.color }}>
                            {ev.time && <span className="mr-1 opacity-70">{ev.time}</span>}
                            {ev.title}
                          </div>
                        ))}
                        {dayEvts.length === 0 && (
                          <span className="text-xs py-1" style={{ color: "var(--text-muted)" }}>No events</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
        )}

        {/* Event Detail Sidebar */}
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>
            <FileText className="w-4 h-4" style={{ color: "var(--accent)" }} />
            {selectedDate
              ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
              : "Select a date"
            }
          </h2>

          {selectedDate && selectedEvents.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No events on this day</p>
            </div>
          )}

          {selectedEvents.length > 0 && (
            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: "var(--surface-elevated)", borderLeft: `3px solid ${ev.color}` }}
                >
                  <div className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>{ev.title}</div>
                  {ev.time && <div className="text-xs mb-1" style={{ color: "var(--accent)" }}>🕐 {ev.time}</div>}
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>{ev.source}</div>
                  {ev.details && <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{ev.details}</div>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${ev.color}20`, color: ev.color }}>
                      {CATEGORY_LABELS[ev.category] || ev.category}
                    </span>
                    {ev.recurring && <span className="text-xs" style={{ color: "var(--text-muted)" }}>🔄 Recurring</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!selectedDate && (
            <div className="space-y-3 mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Legend</h3>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CATEGORY_COLORS[key] }} />
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
                </div>
              ))}

              <h3 className="text-xs font-semibold uppercase tracking-wider mt-4" style={{ color: "var(--text-muted)" }}>Upcoming</h3>
              {filteredEvents
                .filter((e) => e.date >= today)
                .slice(0, 5)
                .map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedDate(ev.date)}
                    className="w-full text-left p-2 rounded-lg transition-colors"
                    style={{ backgroundColor: "var(--surface-elevated)" }}
                  >
                    <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{ev.title}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{ev.date}</div>
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
