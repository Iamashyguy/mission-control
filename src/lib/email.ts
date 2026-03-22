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

// ---- DECODING UTILITIES ----

// Decode quoted-printable encoded string
function decodeQuotedPrintable(str: string): string {
  return str
    // Remove soft line breaks (=\r\n or =\n)
    .replace(/=\r?\n/g, "")
    // Decode =XX hex sequences
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });
}

// Decode base64 string to UTF-8 text
function decodeBase64(str: string): string {
  try {
    const cleaned = str.replace(/[\r\n\s]/g, "");
    return Buffer.from(cleaned, "base64").toString("utf-8");
  } catch {
    return str;
  }
}

// Detect if a string is base64 encoded
function isBase64(str: string): boolean {
  const cleaned = str.replace(/[\r\n\s]/g, "");
  if (cleaned.length < 20) return false;
  // Check if it's mostly base64 chars
  const b64Chars = cleaned.replace(/[A-Za-z0-9+/=]/g, "");
  return b64Chars.length / cleaned.length < 0.05;
}

// Detect if string has quoted-printable artifacts
function hasQuotedPrintable(str: string): boolean {
  return /=[0-9A-Fa-f]{2}|=\r?\n/.test(str);
}

// Strip HTML tags and decode HTML entities, extract readable text
function stripHtml(html: string): string {
  return html
    // Remove style/script blocks entirely
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // Replace <br>, <p>, <div>, <tr>, <li> with newlines
    .replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<\s*(p|div|tr|li|h[1-6])\b[^>]*>/gi, "\n")
    // Remove all remaining HTML tags
    .replace(/<[^>]*>/g, "")
    // Decode common HTML entities
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// Master decode function — handles all encoding types
function decodeEmailBody(raw: string): string {
  let text = raw;

  // Step 1: If it looks like base64, decode it first
  if (isBase64(text)) {
    text = decodeBase64(text);
  }

  // Step 2: If it has quoted-printable artifacts, decode those
  if (hasQuotedPrintable(text)) {
    text = decodeQuotedPrintable(text);
  }

  // Step 3: Handle UTF-8 bytes that came from QP decoding
  // (QP decodes =E2=80=9C to raw bytes, need to re-interpret as UTF-8)
  try {
    const bytes = [];
    let i = 0;
    let hasHighBytes = false;
    while (i < text.length) {
      const code = text.charCodeAt(i);
      if (code > 127) hasHighBytes = true;
      bytes.push(code & 0xFF);
      i++;
    }
    if (hasHighBytes) {
      text = Buffer.from(bytes).toString("utf-8");
    }
  } catch {
    // Keep as-is if re-encoding fails
  }

  // Step 4: If it still has HTML tags, strip them
  if (/<[a-zA-Z][^>]*>/.test(text)) {
    text = stripHtml(text);
  }

  // Step 5: Clean up whitespace
  text = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")      // Max 2 consecutive newlines
    .replace(/[ \t]{2,}/g, " ")       // Collapse multiple spaces
    .replace(/^\s+$/gm, "")           // Remove whitespace-only lines
    .trim();

  // Step 6: Remove [image: ...] placeholders and other noise
  text = text
    .replace(/\[image:[^\]]*\]/gi, "")
    .replace(/\[cid:[^\]]*\]/gi, "")
    .trim();

  return text;
}

// Find the best text part path from bodyStructure
function findTextPartPath(structure: any, path: string = ""): { textPath: string | null; htmlPath: string | null; charset: string } {
  if (!structure) return { textPath: null, htmlPath: null, charset: "utf-8" };

  const type = structure.type?.toLowerCase() || "";
  const subtype = structure.subtype?.toLowerCase() || "";
  const charset = structure.parameters?.charset?.toLowerCase() || "utf-8";

  if (type === "text" && subtype === "plain") {
    return { textPath: path || "1", htmlPath: null, charset };
  }
  if (type === "text" && subtype === "html") {
    return { textPath: null, htmlPath: path || "1", charset };
  }

  // Multipart — search children
  if (structure.childNodes && structure.childNodes.length > 0) {
    let textPath: string | null = null;
    let htmlPath: string | null = null;
    let foundCharset = "utf-8";

    for (let i = 0; i < structure.childNodes.length; i++) {
      const childPath = path ? `${path}.${i + 1}` : `${i + 1}`;
      const result = findTextPartPath(structure.childNodes[i], childPath);
      if (result.textPath && !textPath) { textPath = result.textPath; foundCharset = result.charset; }
      if (result.htmlPath && !htmlPath) { htmlPath = result.htmlPath; if (!textPath) foundCharset = result.charset; }
    }

    return { textPath, htmlPath, charset: foundCharset };
  }

  return { textPath: null, htmlPath: null, charset: "utf-8" };
}

// Decode buffer with charset support
function decodeWithCharset(buffer: Buffer, charset: string): string {
  const cs = charset.toLowerCase().replace(/[^a-z0-9-]/g, "");
  try {
    // Node.js TextDecoder supports common charsets
    const decoder = new TextDecoder(cs === "utf8" ? "utf-8" : cs);
    return decoder.decode(buffer);
  } catch {
    // Fallback: try utf-8, then latin1
    try {
      return buffer.toString("utf-8");
    } catch {
      return buffer.toString("latin1");
    }
  }
}

// Category rules
const CATEGORY_RULES: {
  category: EmailCategory;
  priority: "critical" | "high" | "normal" | "low";
  match: (from: string, subject: string, to: string) => boolean;
  actionExtractor?: (subject: string, preview: string) => string | null;
}[] = [
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
      /payment fail|declined|overdue|suspend|cancel.*account|past due|action required.*pay|invalid payment|balance.*critical/i.test(s),
    actionExtractor: (s) => `💳 Payment issue: ${s.slice(0, 60)}`,
  },
  {
    category: "domain",
    priority: "critical",
    match: (f, s) =>
      /domain.*(expir|renew|transfer|delet)|ssl.*(expir|renew)|nameserv|price increase/i.test(s) ||
      /namecheap|godaddy|cloudflare|porkbun/i.test(f),
    actionExtractor: (s, p) => {
      const days = p.match(/(\d+)\s*days?/i);
      return days ? `🌐 Domain action in ${days[1]} days` : `🌐 Domain: ${s.slice(0, 50)}`;
    },
  },
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
      /money (received|sent)|transfer|wire|ach|deposit|withdraw|refund|charge|balance|authorized|unsuccessful/i.test(s) ||
      /wise\.com|slash\.com|hdfc|icici|razorpay|paypal|stripe/i.test(f),
    actionExtractor: (s) => {
      if (/fail|unsuccessful|declined/i.test(s)) return `🏦 Failed: ${s.slice(0, 50)}`;
      return null;
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
  {
    category: "billing",
    priority: "normal",
    match: (f, s) =>
      /invoice|receipt|billing|subscription|renewal|charged|payment (confirm|success)|recharge/i.test(s) ||
      /hostinger|render|vercel|1password|figma/i.test(f),
  },
  {
    category: "deploy",
    priority: "normal",
    match: (f, s) =>
      /deploy|build (success|fail)|ci\/cd|github action|render|vercel|congrats.*click/i.test(s) ||
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
  { category: "noise", priority: "low", match: () => true },
];

function categorizeEmail(
  from: string, fromEmail: string, subject: string, preview: string, toEmail: string
): { category: EmailCategory; priority: "critical" | "high" | "normal" | "low"; actionRequired: string | null } {
  for (const rule of CATEGORY_RULES) {
    if (rule.match(fromEmail, subject, toEmail)) {
      const action = rule.actionExtractor ? rule.actionExtractor(subject, preview) : null;
      return { category: rule.category, priority: rule.priority, actionRequired: action };
    }
  }
  return { category: "noise", priority: "low", actionRequired: null };
}

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
      })) {
        const envelope = msg.envelope;
        if (!envelope) continue;

        const fromAddr = envelope.from?.[0];
        const toAddr = envelope.to?.[0];
        const fromName = fromAddr?.name || fromAddr?.address || "Unknown";
        const fromMail = fromAddr?.address || "";
        const subject = envelope.subject || "(No Subject)";
        const toMail = toAddr?.address || "";

        // Find best text part from bodyStructure
        const { textPath, htmlPath, charset } = findTextPartPath(msg.bodyStructure);
        const fetchPath = textPath || htmlPath || "1";

        messages.push({
          id: `${account.email}-${msg.uid}`,
          uid: msg.uid,
          from: fromName,
          fromEmail: fromMail,
          to: toMail,
          subject,
          preview: "",
          date: envelope.date?.toISOString() || new Date().toISOString(),
          read: msg.flags?.has("\\Seen") || false,
          starred: msg.flags?.has("\\Flagged") || false,
          hasAttachment: hasAttachments(msg.bodyStructure),
          account: account.email,
          accountLabel: account.label,
          category: "noise",
          priority: "low",
          actionRequired: null,
          _fetchPath: fetchPath,
          _charset: charset,
          _seq: msg.seq,
        } as any);
      }

      // Second pass: fetch body content
      if (messages.length > 0) {
        const seqStart = Math.max(1, totalMessages - limit + 1);

        // Collect all unique body part paths we need
        const allPaths = new Set<string>();
        for (const m of messages) {
          allPaths.add((m as any)._fetchPath || "1");
        }

        // Fetch all needed body parts
        try {
          for await (const msg of client.fetch(`${seqStart}:*`, {
            uid: true,
            bodyParts: [...allPaths],
          })) {
            const match = messages.find((m) => m.uid === msg.uid);
            if (!match || !msg.bodyParts) continue;

            const fetchPath = (match as any)._fetchPath || "1";
            const charset = (match as any)._charset || "utf-8";
            const bodyPart = msg.bodyParts.get(fetchPath);

            if (bodyPart) {
              // Decode with proper charset
              const rawText = decodeWithCharset(bodyPart, charset);
              const decoded = decodeEmailBody(rawText);
              // Filter out garbled content — if >20% non-printable, use subject instead
              const printable = decoded.replace(/[\x20-\x7E\n\r\t\u00A0-\uFFFF]/g, "");
              if (printable.length / Math.max(decoded.length, 1) > 0.2) {
                match.preview = match.subject; // Too garbled, use subject
              } else {
                match.preview = decoded.slice(0, 400);
              }
            }
          }
        } catch (fetchErr) {
          console.error("Body fetch error:", fetchErr);
        }
      }

      // Categorize all messages now that we have preview text
      for (const m of messages) {
        const { category, priority, actionRequired } = categorizeEmail(
          m.from, m.fromEmail, m.subject, m.preview, m.to
        );
        m.category = category;
        m.priority = priority;
        m.actionRequired = actionRequired;
        // Clean up internal fields
        delete (m as any)._fetchPath;
        delete (m as any)._seq;
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

  // Sort: priority first, then date
  const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
  allEmails.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const actionItems = allEmails
    .filter((e) => e.actionRequired)
    .map((e) => ({
      action: e.actionRequired!,
      email: e.subject,
      account: e.accountLabel,
      date: e.date,
      priority: e.priority,
    }));

  const categoryCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  for (const e of allEmails) {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    priorityCounts[e.priority] = (priorityCounts[e.priority] || 0) + 1;
  }

  return { emails: allEmails, accounts: accountStatuses, errors, actionItems, categoryCounts, priorityCounts };
}
