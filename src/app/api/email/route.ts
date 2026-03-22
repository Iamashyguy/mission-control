import { NextResponse } from "next/server";
import { fetchAllEmails, loadEmailAccounts } from "@/lib/email";

export const dynamic = "force-dynamic";

let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const refresh = searchParams.get("refresh") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "15"), 50);

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
        actionItems: [],
        categoryCounts: {},
        priorityCounts: {},
        errors: ["No email accounts configured"],
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
      actionItems: result.actionItems,
      categoryCounts: result.categoryCounts,
      priorityCounts: result.priorityCounts,
      errors: result.errors,
      fetchedAt: new Date().toISOString(),
    };

    cache = { data: responseData, timestamp: Date.now() };
    return NextResponse.json(responseData);
  } catch (err: any) {
    return NextResponse.json(
      { accounts: [], emails: [], actionItems: [], errors: [err.message] },
      { status: 500 }
    );
  }
}
