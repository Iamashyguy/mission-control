import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Finance Dashboard API — placeholder until bank integrations are set up
// Currently shows known accounts and revenue sources

export async function GET() {
  // Known bank accounts (from USER.md)
  const accounts = [
    {
      id: "hdfc",
      name: "HDFC Bank",
      country: "India",
      flag: "🇮🇳",
      currency: "INR",
      type: "Savings",
      status: "not_connected",
    },
    {
      id: "slash",
      name: "Slash (US)",
      country: "United States",
      flag: "🇺🇸",
      currency: "USD",
      type: "Business",
      status: "not_connected",
    },
    {
      id: "wise",
      name: "Wise (UK)",
      country: "United Kingdom",
      flag: "🇬🇧",
      currency: "GBP",
      type: "Business",
      status: "not_connected",
    },
  ];

  // Revenue sources
  const revenueSources = [
    { name: "Google AdSense / ADX", category: "Ad Revenue", status: "active", icon: "💰" },
    { name: "Affiliate Marketing", category: "CPA/CPI", status: "active", icon: "🤝" },
    { name: "Content Arbitrage", category: "Paid Traffic", status: "active", icon: "📊" },
    { name: "Propeller Ads", category: "Ad Network", status: "active", icon: "📢" },
    { name: "Freelancing / Design", category: "Services", status: "occasional", icon: "🎨" },
  ];

  // AI costs (known)
  const aiCosts = {
    monthly: {
      claudeMax: 200,
      minimaxPlus: 20,
      total: 220,
    },
    previous: 1200,
    savings: 980,
  };

  // Currencies tracked
  const currencies = ["INR", "USD", "GBP", "AED"];

  return NextResponse.json({
    accounts,
    revenueSources,
    aiCosts,
    currencies,
    setupRequired: true,
    setupOptions: [
      {
        name: "Manual CSV Import",
        difficulty: "Easy",
        description: "Export transactions from bank apps and upload CSV files",
      },
      {
        name: "Plaid API",
        difficulty: "Medium",
        description: "Automated bank connections (US/UK banks supported)",
      },
      {
        name: "Google Sheets Sync",
        difficulty: "Easy",
        description: "Link a Google Sheet with transaction data",
      },
    ],
  });
}
