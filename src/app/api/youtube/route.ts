import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    setupRequired: true,
    pipeline: [
      { stage: "Ideas", count: 0, icon: "💡" },
      { stage: "Script", count: 0, icon: "📝" },
      { stage: "Recording", count: 0, icon: "🎥" },
      { stage: "Editing", count: 0, icon: "✂️" },
      { stage: "Scheduled", count: 0, icon: "📅" },
      { stage: "Published", count: 0, icon: "✅" },
    ],
    setupSteps: [
      "Create YouTube channel or connect existing",
      "Enable YouTube Data API v3 in Google Cloud Console",
      "Generate OAuth2 credentials for MC",
      "Connect YouTube Studio analytics",
    ],
  });
}
