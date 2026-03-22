import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const templates = [
    { id: "discover-pipeline", name: "Discover Publishing Pipeline", steps: ["Scrape Competitors", "Generate Titles", "Write Content", "Generate Images", "Publish to WordPress", "Report"], status: "active", runs: "14 cron runs/day", icon: "🔍" },
    { id: "daily-report", name: "Daily Report", steps: ["Collect Stats", "Analyze Trends", "Generate Report", "Send to Telegram"], status: "active", runs: "1x daily", icon: "📊" },
    { id: "morning-briefing", name: "Morning Briefing", steps: ["Read Status", "Check Calendar", "Weather", "Priority Tasks", "Send Briefing"], status: "active", runs: "6:30 AM IST", icon: "☀️" },
    { id: "backup-sync", name: "Backup & Sync", steps: ["Check Files", "Create Archive", "Upload to Cloud", "Verify"], status: "planned", runs: "Not scheduled", icon: "💾" },
    { id: "content-arbitrage", name: "Content Arbitrage Pipeline", steps: ["Find Trending", "Create Content", "Push Ads", "Track ROI", "Optimize"], status: "planned", runs: "Manual", icon: "💰" },
  ];

  return NextResponse.json({ templates, totalActive: templates.filter(t => t.status === "active").length, totalPlanned: templates.filter(t => t.status === "planned").length });
}
