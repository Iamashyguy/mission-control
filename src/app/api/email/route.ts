import { NextResponse } from "next/server";
import { fetchAllEmails, loadEmailAccounts } from "@/lib/email";

export const dynamic = "force-dynamic";

// Simple in-memory cache to avoid hammering IMAP on every request
let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "15"), 50);

  // Return cached data if fresh
  if (cache && !refresh && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const accounts = loadEmailAccounts();

    if (accounts.length === 0) {
      return NextResponse.json({
        accounts: [],
        totalAccounts: 0,
        connectedAccounts: 0,
        setupRequired: true,
        emails: [],
        errors: ["No email accounts configured. Add credentials to config/email-credentials.json"],
      });
    }

    const result = await fetchAllEmails(limit);

    const responseData = {
      accounts: result.accounts,
      totalAccounts: result.accounts.length,
      connectedAccounts: result.accounts.filter((a) => a.status === "connected").length,
      setupRequired: false,
      emails: result.emails,
      totalEmails: result.emails.length,
      unreadCount: result.emails.filter((e) => !e.read).length,
      starredCount: result.emails.filter((e) => e.starred).length,
      errors: result.errors,
      fetchedAt: new Date().toISOString(),
    };

    // Cache the result
    cache = { data: responseData, timestamp: Date.now() };

    return NextResponse.json(responseData);
  } catch (err: any) {
    return NextResponse.json(
      {
        accounts: [],
        totalAccounts: 0,
        connectedAccounts: 0,
        setupRequired: false,
        emails: [],
        errors: [err.message || "Failed to fetch emails"],
      },
      { status: 500 }
    );
  }
}
