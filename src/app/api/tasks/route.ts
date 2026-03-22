import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const DB_PATH = path.join(process.cwd(), "data", "tasks.db");

function getDb(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority TEXT DEFAULT 'P3',
      agent TEXT DEFAULT '',
      column_id TEXT DEFAULT 'inbox',
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
  `);

  // Seed default tasks if empty
  const count = (db.prepare("SELECT COUNT(*) as n FROM tasks").get() as { n: number }).n;
  if (count === 0) {
    const insert = db.prepare(`INSERT INTO tasks (id, title, description, priority, agent, column_id, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const now = new Date().toISOString();
    const defaults = [
      ["Wire Email Hub to real IMAP", "Connect Gmail via App Passwords", "P2", "Dev", "inbox", '["mission-control","integration"]'],
      ["Finance page — bank API setup", "Plaid or CSV import for Slash/Wise/HDFC", "P3", "Dev", "inbox", '["mission-control","finance"]'],
      ["Revenue dashboard — AdSense API", "Google AdSense reporting API integration", "P2", "", "inbox", '["mission-control","revenue"]'],
      ["Calendar — Google Calendar sync", "OAuth2 + Calendar API for real events", "P3", "", "inbox", '["mission-control"]'],
      ["Mission Control fixes — 10 issues", "Activity, Costs, Settings, Notifications, Tasks, Memory Graph, 3D Office, Organigrama, Real-time", "P1", "Dev", "in-progress", '["mission-control"]'],
      ["Discover sites warmup monitoring", "Track day_number and publishing cadence", "P2", "Discover", "in-progress", '["discover"]'],
      ["Phase 0-2 complete", "Foundation, core pages, advanced features", "P1", "Dev", "done", '["mission-control"]'],
      ["Cost optimization done", "Migrated from $1200/mo to $220/mo", "P1", "Dev", "done", '["cost-optimization"]'],
    ];
    for (const [title, desc, priority, agent, col, tags] of defaults) {
      insert.run(randomUUID(), title, desc, priority, agent, col, tags, now, now);
    }
  }

  return db;
}

export async function GET() {
  const db = getDb();
  try {
    const tasks = db.prepare("SELECT * FROM tasks ORDER BY created_at DESC").all() as Record<string, unknown>[];
    return NextResponse.json({
      tasks: tasks.map((t) => ({
        ...t,
        tags: JSON.parse((t.tags as string) || "[]"),
      })),
    });
  } finally {
    db.close();
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const db = getDb();
  try {
    const id = randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO tasks (id, title, description, priority, agent, column_id, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, body.title, body.description || "", body.priority || "P3", body.agent || "", body.column_id || "inbox", JSON.stringify(body.tags || []), now, now);

    return NextResponse.json({ id, success: true }, { status: 201 });
  } finally {
    db.close();
  }
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "Task ID required" }, { status: 400 });
  }

  const db = getDb();
  try {
    const now = new Date().toISOString();
    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of ["title", "description", "priority", "agent", "column_id"]) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }
    if (body.tags !== undefined) {
      updates.push("tags = ?");
      values.push(JSON.stringify(body.tags));
    }
    updates.push("updated_at = ?");
    values.push(now);
    values.push(body.id);

    db.prepare(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    return NextResponse.json({ success: true });
  } finally {
    db.close();
  }
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const db = getDb();
  try {
    db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } finally {
    db.close();
  }
}
