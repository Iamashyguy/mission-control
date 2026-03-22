import { NextResponse } from "next/server";
import { checkNewEmails, generateMorningDigest, markActionHandled } from "@/lib/email-alerts";

export const dynamic = "force-dynamic";

// GET — check for new emails (cron calls this)
// ?action=check — check new emails, return alert message
// ?action=digest — generate morning digest
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "check";

  try {
    if (action === "digest") {
      const digest = await generateMorningDigest();
      return NextResponse.json({ digest });
    }

    const result = await checkNewEmails();
    return NextResponse.json({
      hasNewEmails: !!result.alertMessage,
      alertMessage: result.alertMessage,
      criticalCount: result.newCritical.length,
      highCount: result.newHigh.length,
      summary: result.summary,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — mark action as handled
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.actionId) {
      markActionHandled(body.actionId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "actionId required" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
