import { NextResponse } from "next/server";
import { markActionHandled, getHandledActions } from "@/lib/email-alerts";

export const dynamic = "force-dynamic";

// POST — mark action as handled
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.emailId) {
      markActionHandled(body.emailId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "emailId required" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// GET — get list of handled action IDs
export async function GET() {
  return NextResponse.json({ handled: getHandledActions() });
}
