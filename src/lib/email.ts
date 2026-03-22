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
      if (!mailbox || !mailbox.exists) {
        return messages;
      }

      // Fetch last N messages by sequence number
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

        // Extract preview from body part
        let preview = "";
        if (msg.bodyParts) {
          const bodyPart = msg.bodyParts.get("1");
          if (bodyPart) {
            preview = bodyPart.toString("utf-8").replace(/<[^>]*>/g, "").slice(0, 200).trim();
          }
        }

        messages.push({
          id: `${account.email}-${msg.uid}`,
          uid: msg.uid,
          from: fromAddr?.name || fromAddr?.address || "Unknown",
          fromEmail: fromAddr?.address || "",
          to: toAddr?.address || "",
          subject: envelope.subject || "(No Subject)",
          preview: preview || envelope.subject || "",
          date: envelope.date?.toISOString() || new Date().toISOString(),
          read: msg.flags?.has("\\Seen") || false,
          starred: msg.flags?.has("\\Flagged") || false,
          hasAttachment: hasAttachments(msg.bodyStructure),
          account: account.email,
          accountLabel: account.label,
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

// Check if message has attachments from body structure
function hasAttachments(structure: any): boolean {
  if (!structure) return false;
  if (structure.disposition === "attachment") return true;
  if (structure.childNodes) {
    return structure.childNodes.some((child: any) => hasAttachments(child));
  }
  return false;
}

// Fetch from all accounts, merge and sort by date
export async function fetchAllEmails(
  limit: number = 15
): Promise<{
  emails: EmailMessage[];
  accounts: { email: string; label: string; status: string; count: number }[];
  errors: string[];
}> {
  const accounts = loadEmailAccounts();
  const allEmails: EmailMessage[] = [];
  const accountStatuses: { email: string; label: string; status: string; count: number }[] = [];
  const errors: string[] = [];

  // Fetch from all accounts in parallel
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
      const errMsg = result.reason?.message || "Unknown error";
      errors.push(errMsg);
      // Try to extract which account failed
      accountStatuses.push({
        email: "unknown",
        label: "Error",
        status: "error",
        count: 0,
      });
    }
  }

  // Sort all emails by date (newest first)
  allEmails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    emails: allEmails,
    accounts: accountStatuses,
    errors,
  };
}
