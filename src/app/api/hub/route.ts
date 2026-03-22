import { NextResponse } from "next/server";
import fs from "fs";
import { OPENCLAW_CONFIG, DISCOVER_STATUS } from "@/lib/paths";

export const dynamic = "force-dynamic";

export async function GET() {
  // Read agent count from openclaw.json
  let agentCount = 0;
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, "utf-8"));
    agentCount = config?.agents?.list?.length || 0;
  } catch {}

  // Read discover status for error info
  let discoverErrors = 0;
  try {
    if (fs.existsSync(DISCOVER_STATUS)) {
      const status = JSON.parse(fs.readFileSync(DISCOVER_STATUS, "utf-8"));
      discoverErrors = status?.errors?.critical_count || 0;
    }
  } catch {}

  return NextResponse.json({
    agents: {
      total: agentCount,
      active: agentCount,
    },
    costs: {
      today: 0,
      month: 220,
      projected: 220,
    },
    sessions: {
      active: 0,
      today: 0,
    },
    errors: {
      today: discoverErrors,
      unresolved: discoverErrors,
    },
    system: {
      cpu: 0,
      ram: 0,
      uptime: "0h",
    },
    recentActivity: [],
  });
}
