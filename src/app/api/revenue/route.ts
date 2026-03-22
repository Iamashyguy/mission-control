import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Revenue Dashboard API — placeholder until AdSense/affiliate APIs connected
export async function GET() {
  const revenueSources = [
    { id: "adsense", name: "Google AdSense / ADX", icon: "💰", status: "active", category: "Ad Revenue", connected: false },
    { id: "affiliate", name: "Affiliate Marketing", icon: "🤝", status: "active", category: "CPA/CPI", connected: false },
    { id: "arbitrage", name: "Content Arbitrage", icon: "📊", status: "active", category: "Paid Traffic", connected: false },
    { id: "propeller", name: "Propeller Ads", icon: "📢", status: "active", category: "Ad Network", connected: false },
    { id: "freelance", name: "Freelancing / Design", icon: "🎨", status: "occasional", category: "Services", connected: false },
  ];

  const costs = {
    ai: { monthly: 220, breakdown: { claudeMax: 200, minimax: 20 } },
    hosting: { monthly: 15, breakdown: { hostinger: 10, render: 5 } },
    tools: { monthly: 30, breakdown: { cursor: 20, domains: 10 } },
    totalMonthly: 265,
  };

  const sites = [
    { name: "OMHG Shop", niche: "Tech", monetization: "AdSense", status: "active" },
    { name: "Mnail School", niche: "Beauty", monetization: "AdSense", status: "active" },
    { name: "Grand Home", niche: "Automobile", monetization: "AdSense + Affiliate", status: "active" },
    { name: "FinanceCafe", niche: "Finance", monetization: "AdSense + Affiliate", status: "active" },
  ];

  return NextResponse.json({
    revenueSources,
    costs,
    sites,
    setupRequired: true,
    integrationOptions: [
      { name: "Google AdSense API", difficulty: "Medium", description: "Connect via Google API for real-time earnings" },
      { name: "Google Sheets Sync", difficulty: "Easy", description: "Export AdSense data to Sheet, MC reads it" },
      { name: "Manual Entry", difficulty: "Easy", description: "Enter monthly revenue manually" },
    ],
  });
}
