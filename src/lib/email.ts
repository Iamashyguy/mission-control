import { ImapFlow } from "imapflow";
import { readFileSync } from "fs";
import { join } from "path";

export interface EmailAccount {
  email: string;
  type: string;
  app_password: string;
  imap_host: string;
  imap_port: number;
  label: string;
}

export interface EmailMessage {
  id: string;
  uid: number;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  starred: boolean;
  hasAttachment: boolean;
  account: string;
  accountLabel: string;
  category: EmailCategory;
  priority: "critical" | "high" | "normal" | "low";
  actionRequired: string | null;
}

export type EmailCategory =
  | "revenue"
  | "billing"
  | "security"
  | "client"
  | "domain"
  | "deploy"
  | "social"
  | "crypto"
  | "banking"
  | "newsletter"
  | "noise";

// Category rules — order matters, first match wins
const CATEGORY_RULES: {
  category: EmailCategory;
  priority: "critical" | "high" | "normal" | "low";
  match: (from: string, subject: string, to: string) => boolean;
  actionExtractor?: (subject: string, preview: string) => string | null;
}[] = [
  // === CRITICAL ===
  {
    category: "security",
    priority: "critical",
    match: (f, s) =>
      /security alert|suspicious|unauthorized|password.*(change|reset|compromis)|verify your identity|unusual (sign|activity|login)/i.test(s) ||
      /security-noreply|abuse|fraud/i.test(f),
    actionExtractor: (s) => `⚠️ Security: ${s.slice(0, 60)}`,
  },
  {
    category: "billing",
    priority: "critical",
    match: (f, s) =>
      /payment fail|declined|overdue|suspend|cancel.*account|past due|action required.*pay/i.test(s),
    actionExtractor: (s) => `💳 Payment issue: ${s.slice(0, 60)}`,
  },
  {
    category: "domain",
    priority: "critical",
    match: (f, s) =>
      /domain.*(expir|renew|transfer|delet)|ssl.*(expir|renew)|nameserv/i.test(s) ||
      /namecheap|godaddy|cloudflare|porkbun/i.test(f),
    actionExtractor: (s, p) => {
      const days = p.match(/(\d+)\s*days?/i);
      return days ? `🌐 Domain action needed in ${days[1]} days` : `🌐 Domain: ${s.slice(0, 50)}`;
    },
  },

  // === HIGH ===
  {
    category: "revenue",
    priority: "high",
    match: (f, s) =>
      /adsense|ad\s?manager|adx|earnings|revenue|payout|payment.*sent|payment.*process/i.test(s) ||
      /adsense-noreply|admanager-noreply/i.test(f),
    actionExtractor: (s) =>
      /report|summary|available/i.test(s) ? null : `💰 Revenue: ${s.slice(0, 50)}`,
  },
  {
    category: "banking",
    priority: "high",
    match: (f, s) =>
      /money (received|sent)|transfer|wire|ach|deposit|withdraw|refund|charge|balance/i.test(s) ||
      /wise\.com|slash\.com|hdfc|icici|razorpay|paypal|stripe/i.test(f),
    actionExtractor: (s) => {
      if (/sent|transfer|withdraw/i.test(s)) return `🏦 ${s.slice(0, 60)}`;
      return null; // Received = info only
    },
  },
  {
    category: "client",
    priority: "high",
    match: (f, s, t) =>
      /invoice|proposal|contract|project|deliverable|deadline|meeting/i.test(s) &&
      !/noreply|no-reply|notification/i.test(f),
    actionExtractor: (s) => `👤 Client: ${s.slice(0, 50)}`,
  },
  {
    category: "crypto",
    priority: "high",
    match: (f, s) =>
      /binance|coinbase|kraken|kucoin|crypto|bitcoin|ethereum|kyc|withdraw/i.test(s) ||
      /binance\.com|coinbase\.com/i.test(f),
    actionExtractor: (s) =>
      /kyc|verify|action|confirm|withdraw/i.test(s) ? `🪙 Crypto: ${s.slice(0, 50)}` : null,
  },

  // === NORMAL ===
  {
    category: "billing",
    priority: "normal",
    match: (f, s) =>
      /invoice|receipt|billing|subscription|renewal|charged|payment confirm/i.test(s) ||
      /hostinger|render|vercel|1password|figma/i.test(f),
  },
  {
    category: "deploy",
    priority: "normal",
    match: (f, s) =>
      /deploy|build (success|fail)|ci\/cd|github action|render|vercel/i.test(s) ||
      /notifications@github|noreply@github|render\.com|vercel\.com/i.test(f),
  },
  {
    category: "social",
    priority: "low",
    match: (f, s) =>
      /twitter|x\.com|facebook|instagram|linkedin|youtube|tiktok/i.test(f) ||
      /new follower|mentioned you|liked your|comment on|subscrib/i.test(s),
  },
  {
    category: "newsletter",
    priority: "low",
    match: (f, s) =>
      /newsletter|digest|weekly|roundup|unsubscribe|update from|new on/i.test(s) ||
      /substack|mailchimp|convertkit|beehiiv/i.test(f),
  },

  // Default = noise
  {
    category: "noise",
    priority: "low",
    match: () => true,
  },
];

function categorizeEmail(
  from: string,
  fromEmail: string,
  subject: string,
  preview: string,
  toEmail: string
): { category: EmailCategory; priority: "critical" | "high" | "normal" | "low"; actionRequired: string | null } {
  for (const rule of CATEGORY_RULES) {
    if (rule.match(fromEmail, subject, toEmail)) {
      const action = rule.actionExtractor ? rule.actionExtractor(subject, preview) : null;
      return { category: rule.category, priority: rule.priority, actionRequired: action };
    }
  }
  return { category: "noise", priority: "low", actionRequired: null };
}

// Load credentials from config file
export function loadEmailAccounts(): EmailAccount[] {
  try {
    const configPath = join(
      process.env.HOME || "/Users/iamashyguy",
      ".openclaw/workspace/config/email-credentials.json"
    );
    const raw = readFileSync(configPath, "utf-8");
    const config = JSON.parse(raw);
    return config.accounts || [];
  } catch (err) {
    console.error("Failed to load email credentials:", err);
    return [];
  }
}

// Fetch recent emails from a single IMAP account
async function fetchFromAccount(
  account: EmailAccount,
  limit: number = 20
): Promise<EmailMessage[]> {
  const client = new ImapFlow({
    host: account.imap_host,
    port: account.imap_port,
    secure: true,
    auth: {
      user: account.email,
      pass: account.app_password.replace(/\s/g, ""),
    },
    logger: false,
  });

  const messages: EmailMessage[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const mailbox = client.mailbox;
      if (!mailbox || !mailbox.exists) return messages;

      const totalMessages = mailbox.exists;
      const startSeq = Math.max(1, totalMessages - limit + 1);
      const range = `${startSeq}:*`;

      for await (const msg of client.fetch(range, {
        envelope: true,
        flags: true,
        bodyStructure: true,
        bodyParts: ["1"],
      })) {
        const envelope = msg.envelope;
        if (!envelope) continue;

        const fromAddr = envelope.from?.[0];
        const toAddr = envelope.to?.[0];

        let preview = "";
        if (msg.bodyParts) {
          const bodyPart = msg.bodyParts.get("1");
          if (bodyPart) {
            preview = bodyPart.toString("utf-8").replace(/<[^>]*>/g, "").slice(0, 300).trim();
          }
        }

        const fromName = fromAddr?.name || fromAddr?.address || "Unknown";
        const fromMail = fromAddr?.address || "";
        const subject = envelope.subject || "(No Subject)";
        const toMail = toAddr?.address || "";

        const { category, priority, actionRequired } = categorizeEmail(
          fromName, fromMail, subject, preview, toMail
        );

        messages.push({
          id: `${account.email}-${msg.uid}`,
          uid: msg.uid,
          from: fromName,
          fromEmail: fromMail,
          to: toMail,
          subject,
          preview: preview || subject,
          date: envelope.date?.toISOString() || new Date().toISOString(),
          read: msg.flags?.has("\\Seen") || false,
          starred: msg.flags?.has("\\Flagged") || false,
          hasAttachment: hasAttachments(msg.bodyStructure),
          account: account.email,
          accountLabel: account.label,
          category,
          priority,
          actionRequired,
        });
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error(`IMAP error for ${account.email}:`, err);
  }

  return messages;
}

function hasAttachments(structure: any): boolean {
  if (!structure) return false;
  if (structure.disposition === "attachment") return true;
  if (structure.childNodes) {
    return structure.childNodes.some((child: any) => hasAttachments(child));
  }
  return false;
}

// Fetch from all accounts, merge and sort
export async function fetchAllEmails(
  limit: number = 15
): Promise<{
  emails: EmailMessage[];
  accounts: { email: string; label: string; status: string; count: number }[];
  errors: string[];
  actionItems: { action: string; email: string; account: string; date: string; priority: string }[];
  categoryCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
}> {
  const accounts = loadEmailAccounts();
  const allEmails: EmailMessage[] = [];
  const accountStatuses: { email: string; label: string; status: string; count: number }[] = [];
  const errors: string[] = [];

  const results = await Promise.allSettled(
    accounts.map(async (account) => {
      const emails = await fetchFromAccount(account, limit);
      return { account, emails };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { account, emails } = result.value;
      allEmails.push(...emails);
      accountStatuses.push({
        email: account.email,
        label: account.label,
        status: emails.length > 0 ? "connected" : "empty",
        count: emails.length,
      });
    } else {
      errors.push(result.reason?.message || "Unknown error");
      accountStatuses.push({ email: "unknown", label: "Error", status: "error", count: 0 });
    }
  }

  // Sort: priority first (critical > high > normal > low), then date
  const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
  allEmails.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Extract action items
  const actionItems = allEmails
    .filter((e) => e.actionRequired)
    .map((e) => ({
      action: e.actionRequired!,
      email: e.subject,
      account: e.accountLabel,
      date: e.date,
      priority: e.priority,
    }));

  // Count by category
  const categoryCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  for (const e of allEmails) {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    priorityCounts[e.priority] = (priorityCounts[e.priority] || 0) + 1;
  }

  return { emails: allEmails, accounts: accountStatuses, errors, actionItems, categoryCounts, priorityCounts };
}
