import { NextResponse } from "next/server";
import { fetchAllEmails, loadEmailAccounts, EmailMessage } from "@/lib/email";
import { getHandledActions } from "@/lib/email-alerts";

export const dynamic = "force-dynamic";

let cache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

// Smart threading — group emails from same sender
function threadEmails(emails: EmailMessage[]): any[] {
  const threads = new Map<string, EmailMessage[]>();
  for (const e of emails) {
    const key = e.fromEmail.toLowerCase();
    if (!threads.has(key)) threads.set(key, []);
    threads.get(key)!.push(e);
  }

  return [...threads.entries()].map(([sender, msgs]) => ({
    sender,
    senderName: msgs[0].from,
    count: msgs.length,
    latestDate: msgs[0].date,
    categories: [...new Set(msgs.map((m) => m.category))],
    accounts: [...new Set(msgs.map((m) => m.accountLabel))],
    emails: msgs,
    isGrouped: msgs.length > 1,
  }));
}

// Unsubscribe suggestions — find noisy senders
function getUnsubscribeSuggestions(emails: EmailMessage[]): any[] {
  const senderCounts = new Map<string, { from: string; email: string; count: number; categories: Set<string> }>();
  for (const e of emails) {
    const key = e.fromEmail.toLowerCase();
    if (!senderCounts.has(key)) {
      senderCounts.set(key, { from: e.from, email: e.fromEmail, count: 0, categories: new Set() });
    }
    const s = senderCounts.get(key)!;
    s.count++;
    s.categories.add(e.category);
  }

  return [...senderCounts.values()]
    .filter((s) => s.count >= 3 && [...s.categories].every((c) => ["noise", "newsletter", "social"].includes(c)))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((s) => ({
      from: s.from,
      email: s.email,
      count: s.count,
      category: [...s.categories][0],
      suggestion: `Unsubscribe from ${s.from} — ${s.count} noise emails`,
    }));
}

// Account health stats
function getAccountHealth(emails: EmailMessage[], accounts: any[]): any[] {
  const importantCategories = new Set(["revenue", "billing", "security", "client", "domain", "banking", "crypto", "deploy"]);

  return accounts.map((acc) => {
    const accEmails = emails.filter((e) => e.account === acc.email);
    const important = accEmails.filter((e) => importantCategories.has(e.category));
    const noise = accEmails.filter((e) => !importantCategories.has(e.category));
    const unread = accEmails.filter((e) => !e.read);
    const lastImportant = important.length > 0 ? important[0].date : null;

    return {
      ...acc,
      totalEmails: accEmails.length,
      importantCount: important.length,
      noiseCount: noise.length,
      unreadCount: unread.length,
      noiseRatio: accEmails.length > 0 ? Math.round((noise.length / accEmails.length) * 100) : 0,
      lastImportantEmail: lastImportant,
      health: noise.length > important.length * 3 ? "noisy" : important.length > 0 ? "healthy" : "quiet",
    };
  });
}

// Auto-labels — extract financial amounts from email subjects
function extractAutoLabels(emails: EmailMessage[]): any[] {
  const labels: any[] = [];

  // Revenue/banking summaries
  const moneyPattern = /\$[\d,]+\.?\d*|₹[\d,]+\.?\d*|£[\d,]+\.?\d*|€[\d,]+\.?\d*|US\$[\d,]+\.?\d*|Rs\.?\s*[\d,]+\.?\d*/g;

  const received: { amount: string; from: string; date: string }[] = [];
  const sent: { amount: string; to: string; date: string }[] = [];
  const failed: { amount: string; details: string; date: string }[] = [];

  for (const e of emails) {
    const amounts = (e.subject + " " + e.preview).match(moneyPattern);
    if (!amounts) continue;

    if (/received|credited|refund|earned|payout/i.test(e.subject)) {
      received.push({ amount: amounts[0], from: e.from, date: e.date });
    } else if (/sent|transfer|paid|charged|authorized|payment to/i.test(e.subject)) {
      sent.push({ amount: amounts[0], to: e.from, date: e.date });
    } else if (/fail|declined|unsuccessful|invalid/i.test(e.subject)) {
      failed.push({ amount: amounts[0], details: e.subject.slice(0, 50), date: e.date });
    }
  }

  if (received.length > 0) {
    labels.push({
      type: "money_in",
      icon: "💰",
      label: `${received.length} payments received`,
      details: received.slice(0, 5).map((r) => `${r.amount} from ${r.from}`),
    });
  }
  if (sent.length > 0) {
    labels.push({
      type: "money_out",
      icon: "💸",
      label: `${sent.length} payments sent`,
      details: sent.slice(0, 5).map((s) => `${s.amount} to ${s.to}`),
    });
  }
  if (failed.length > 0) {
    labels.push({
      type: "money_failed",
      icon: "⚠️",
      label: `${failed.length} payment issues`,
      details: failed.slice(0, 5).map((f) => `${f.amount} — ${f.details}`),
    });
  }

  return labels;
}

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
        accounts: [], totalAccounts: 0, connectedAccounts: 0,
        setupRequired: true, emails: [], actionItems: [],
        categoryCounts: {}, priorityCounts: {},
        threads: [], unsubscribeSuggestions: [], accountHealth: [], autoLabels: [],
        handledActions: [], errors: ["No email accounts configured"],
      });
    }

    const result = await fetchAllEmails(limit);
    const handled = getHandledActions();

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
      // New features
      threads: threadEmails(result.emails),
      unsubscribeSuggestions: getUnsubscribeSuggestions(result.emails),
      accountHealth: getAccountHealth(result.emails, result.accounts),
      autoLabels: extractAutoLabels(result.emails),
      handledActions: handled,
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
