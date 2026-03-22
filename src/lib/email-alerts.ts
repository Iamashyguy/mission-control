/**
 * Email Alerts System
 * - Scans all 9 inboxes for new important emails
 * - Sends alerts to Telegram topic
 * - Tracks seen email UIDs to avoid duplicates
 * - Called by cron every 4 hours
 */

import { fetchAllEmails, EmailMessage } from "./email";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const STATE_FILE = join(
  process.env.HOME || "/Users/iamashyguy",
  ".openclaw/workspace/config/email-alerts-state.json"
);

interface AlertState {
  seenIds: string[]; // email IDs already alerted
  lastRun: string;
  handledActions: string[]; // action items marked as handled
}

function loadState(): AlertState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
    }
  } catch {}
  return { seenIds: [], lastRun: new Date(0).toISOString(), handledActions: [] };
}

function saveState(state: AlertState) {
  // Keep only last 500 seen IDs to prevent file bloat
  state.seenIds = state.seenIds.slice(-500);
  state.handledActions = state.handledActions.slice(-200);
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function markActionHandled(actionId: string) {
  const state = loadState();
  if (!state.handledActions.includes(actionId)) {
    state.handledActions.push(actionId);
    saveState(state);
  }
}

export function getHandledActions(): string[] {
  return loadState().handledActions;
}

/**
 * Check for new important emails and return alert message
 * Returns null if nothing new
 */
export async function checkNewEmails(): Promise<{
  alertMessage: string | null;
  newCritical: EmailMessage[];
  newHigh: EmailMessage[];
  summary: string;
}> {
  const state = loadState();
  const seenSet = new Set(state.seenIds);

  const result = await fetchAllEmails(20);

  // Filter to only important (not noise/newsletter/social) and unseen
  const importantCategories = new Set([
    "revenue", "billing", "security", "client", "domain", "banking", "crypto", "deploy"
  ]);

  const newEmails = result.emails.filter(
    (e) => importantCategories.has(e.category) && !seenSet.has(e.id)
  );

  const newCritical = newEmails.filter((e) => e.priority === "critical");
  const newHigh = newEmails.filter((e) => e.priority === "high");
  const newNormal = newEmails.filter((e) => e.priority === "normal");

  // Mark all current emails as seen
  for (const e of result.emails) {
    state.seenIds.push(e.id);
  }
  state.lastRun = new Date().toISOString();
  saveState(state);

  if (newEmails.length === 0) {
    return { alertMessage: null, newCritical: [], newHigh: [], summary: "No new important emails" };
  }

  // Build Telegram message
  let msg = `📧 **Email Alert** (${newEmails.length} new)\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n\n`;

  if (newCritical.length > 0) {
    msg += `🔴 **CRITICAL (${newCritical.length}):**\n`;
    for (const e of newCritical) {
      msg += `• ${e.actionRequired || e.subject}\n`;
      msg += `  _${e.accountLabel} · ${e.fromEmail}_\n`;
    }
    msg += `\n`;
  }

  if (newHigh.length > 0) {
    msg += `🟠 **HIGH (${newHigh.length}):**\n`;
    for (const e of newHigh.slice(0, 10)) {
      const catEmojiMap: Record<string, string> = { revenue: "💰", banking: "🏦", client: "👤", crypto: "🪙", billing: "💳", security: "🔒", domain: "🌐", deploy: "🚀" };
      const catEmoji = catEmojiMap[e.category] || "📧";
      msg += `• ${catEmoji} ${e.subject.slice(0, 60)}\n`;
      msg += `  _${e.accountLabel} · ${e.from}_\n`;
    }
    if (newHigh.length > 10) {
      msg += `  _+${newHigh.length - 10} more..._\n`;
    }
    msg += `\n`;
  }

  if (newNormal.length > 0) {
    msg += `🔵 **Normal (${newNormal.length}):** `;
    msg += newNormal.slice(0, 3).map((e) => e.subject.slice(0, 30)).join(", ");
    if (newNormal.length > 3) msg += ` +${newNormal.length - 3} more`;
    msg += `\n\n`;
  }

  // Action items
  const actions = newEmails.filter((e) => e.actionRequired);
  if (actions.length > 0) {
    msg += `⚡ **Action Required:**\n`;
    for (const a of actions.slice(0, 5)) {
      msg += `→ ${a.actionRequired}\n`;
    }
    msg += `\n`;
  }

  msg += `_${result.accounts.filter((a) => a.status === "connected").length} accounts scanned · ${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST_`;

  const summary = `${newCritical.length} critical, ${newHigh.length} high, ${newNormal.length} normal`;

  return { alertMessage: msg, newCritical, newHigh, summary };
}

/**
 * Generate morning briefing email digest
 */
export async function generateMorningDigest(): Promise<string> {
  const result = await fetchAllEmails(30);

  const importantCategories = new Set([
    "revenue", "billing", "security", "client", "domain", "banking", "crypto", "deploy"
  ]);

  const important = result.emails.filter((e) => importantCategories.has(e.category));
  const unread = important.filter((e) => !e.read);
  const critical = important.filter((e) => e.priority === "critical");
  const high = important.filter((e) => e.priority === "high");
  const actions = important.filter((e) => e.actionRequired);
  const handled = new Set(getHandledActions());

  let digest = `## 📧 Email Digest\n`;
  digest += `${result.accounts.filter((a) => a.status === "connected").length} accounts · ${important.length} important · ${result.emails.length - important.length} noise filtered\n\n`;

  if (critical.length > 0) {
    digest += `### 🔴 Critical (${critical.length})\n`;
    for (const e of critical) {
      const status = handled.has(e.id) ? "✅" : "⏳";
      digest += `- ${status} **${e.subject.slice(0, 60)}** — ${e.accountLabel}\n`;
    }
    digest += `\n`;
  }

  if (high.length > 0) {
    digest += `### 🟠 High Priority (${high.length})\n`;
    // Group by category
    const grouped: Record<string, typeof high> = {};
    for (const e of high) {
      if (!grouped[e.category]) grouped[e.category] = [];
      grouped[e.category].push(e);
    }
    for (const [cat, emails] of Object.entries(grouped)) {
      const catEmojiMap2: Record<string, string> = { revenue: "💰", banking: "🏦", client: "👤", crypto: "🪙", billing: "💳", security: "🔒", domain: "🌐", deploy: "🚀" };
      const catEmoji = catEmojiMap2[cat] || "📧";
      digest += `${catEmoji} **${cat}** (${emails.length}): `;
      digest += emails.slice(0, 3).map((e) => `${e.subject.slice(0, 40)} [${e.accountLabel}]`).join("; ");
      if (emails.length > 3) digest += ` +${emails.length - 3} more`;
      digest += `\n`;
    }
    digest += `\n`;
  }

  if (actions.length > 0) {
    const pendingActions = actions.filter((a) => !handled.has(a.id));
    if (pendingActions.length > 0) {
      digest += `### ⚡ Pending Actions (${pendingActions.length})\n`;
      for (const a of pendingActions.slice(0, 5)) {
        digest += `- ${a.actionRequired}\n`;
      }
      digest += `\n`;
    }
  }

  if (important.length === 0) {
    digest += `✅ All clear — no important emails across all accounts.\n`;
  }

  return digest;
}
