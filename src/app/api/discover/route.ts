import { NextResponse } from "next/server";
import fs from "fs";
import { DISCOVER_DB, DISCOVER_STATUS } from "@/lib/paths";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const result: Record<string, unknown> = {
    sites: [],
    titlePool: { total: 0, byNiche: {} },
    errors: { total: 0, critical: 0, recent: [] },
    status: null,
  };

  // Read status.json first (fast overview)
  try {
    if (fs.existsSync(DISCOVER_STATUS)) {
      result.status = JSON.parse(fs.readFileSync(DISCOVER_STATUS, "utf-8"));
    }
  } catch {}

  // Read from unified.db
  const db = getDb(DISCOVER_DB);
  if (!db) {
    return NextResponse.json(result);
  }

  try {
    // Sites
    const sites = db.prepare(`
      SELECT site_id, site_name, domain, niche, status, target_country as country,
             created_at, day_number, peak_concurrent as peak_active_users
      FROM sites ORDER BY site_id
    `).all();
    result.sites = sites;

    // Count posts per site
    const postCounts = db.prepare(`
      SELECT site_id, COUNT(*) as count FROM posts GROUP BY site_id
    `).all() as Array<{ site_id: string; count: number }>;
    const postMap = new Map(postCounts.map((r) => [r.site_id, r.count]));
    
    // Enrich sites with post count
    result.sites = (sites as Array<Record<string, unknown>>).map((s) => ({
      ...s,
      postCount: postMap.get(s.site_id as string) || 0,
    }));

    // Title pool stats
    try {
      const titleTotal = db.prepare("SELECT COUNT(*) as count FROM titles").get() as { count: number };
      result.titlePool = { total: titleTotal?.count || 0, byNiche: {} };
    } catch {}

    // Errors
    try {
      const errorCount = db.prepare("SELECT COUNT(*) as count FROM error_log WHERE resolved = 0").get() as { count: number };
      const criticalCount = db.prepare("SELECT COUNT(*) as count FROM error_log WHERE severity = 'critical' AND resolved = 0").get() as { count: number };
      const recentErrors = db.prepare(
        "SELECT * FROM error_log WHERE resolved = 0 ORDER BY timestamp DESC LIMIT 5"
      ).all();
      result.errors = {
        total: errorCount?.count || 0,
        critical: criticalCount?.count || 0,
        recent: recentErrors,
      };
    } catch {}
  } catch (err) {
    console.error("Discover DB error:", err);
  }

  return NextResponse.json(result);
}
