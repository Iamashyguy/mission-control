import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Email Hub API — placeholder until IMAP connections are set up
// When ready, this will connect to actual email accounts via IMAP

export async function GET() {
  // Known email accounts (from USER.md and workspace knowledge)
  const accounts = [
    {
      id: "openclaw",
      email: "openclawashish@gmail.com",
      provider: "Gmail",
      icon: "📧",
      status: "not_connected",
      purpose: "OpenClaw / Dev operations",
    },
    {
      id: "personal",
      email: "antarjyamisahu19@gmail.com",
      provider: "Gmail",
      icon: "📧",
      status: "not_connected",
      purpose: "Personal / Git commits",
    },
  ];

  return NextResponse.json({
    accounts,
    totalAccounts: accounts.length,
    connectedAccounts: accounts.filter((a) => a.status === "connected").length,
    setupRequired: true,
    setupInstructions: [
      "1. Generate App Passwords for each Gmail account (Security → 2-Step → App Passwords)",
      "2. Add IMAP credentials to Mission Control config",
      "3. Restart Mission Control to enable email fetching",
      "4. Emails are fetched read-only — no sending capability",
    ],
    recentEmails: [], // Will be populated when connected
  });
}
