"use client";

import { useEffect, useState } from "react";
import { StatsCard } from "@/components/StatsCard";
import { Youtube, Video, Eye, ThumbsUp, Settings } from "lucide-react";

interface YTData {
  setupRequired: boolean;
  pipeline: Array<{ stage: string; count: number; icon: string }>;
  setupSteps: string[];
}

export default function YouTubePage() {
  const [data, setData] = useState<YTData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch("/api/youtube").then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false)); }, []);

  if (loading) return <div className="space-y-6"><h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>YouTube</h1></div>;

  const d = data!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>YouTube Channel</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Content pipeline and video analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Videos" value={0} icon={<Video />} iconColor="var(--negative)" subtitle="Total published" />
        <StatsCard title="Views" value={0} icon={<Eye />} iconColor="var(--accent)" subtitle="All time" />
        <StatsCard title="Likes" value={0} icon={<ThumbsUp />} iconColor="var(--positive)" subtitle="All time" />
        <StatsCard title="Status" value="Not Connected" icon={<Youtube />} iconColor="var(--text-muted)" subtitle="Setup required" />
      </div>

      {/* Content Pipeline */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>Content Pipeline</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {d.pipeline.map((stage, i) => (
            <div key={stage.stage} className="text-center p-4 rounded-lg relative" style={{ backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)" }}>
              <span className="text-2xl">{stage.icon}</span>
              <div className="text-2xl font-bold mt-2" style={{ fontFamily: "var(--font-heading)", color: "var(--text-primary)" }}>{stage.count}</div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{stage.stage}</div>
              {i < d.pipeline.length - 1 && <span className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-lg" style={{ color: "var(--text-muted)" }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Setup */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--warning-soft)", border: "1px solid rgba(255,214,10,0.3)" }}>
        <div className="flex items-start gap-3">
          <Settings className="w-5 h-5 mt-0.5" style={{ color: "var(--warning)" }} />
          <div>
            <h2 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}>Setup Required</h2>
            <div className="space-y-2">
              {d.setupSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-bold mt-0.5" style={{ color: "var(--accent)" }}>{i+1}.</span>
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
