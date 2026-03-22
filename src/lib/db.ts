import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { OPENCLAW_DIR, DISCOVER_DB } from './paths';

// Cache database connections
const dbCache = new Map<string, Database.Database>();

export function getDb(dbPath: string): Database.Database | null {
  if (!fs.existsSync(dbPath)) return null;
  
  if (dbCache.has(dbPath)) {
    return dbCache.get(dbPath)!;
  }
  
  const db = new Database(dbPath, { readonly: true });
  db.pragma('journal_mode = WAL');
  dbCache.set(dbPath, db);
  return db;
}

/**
 * Get the Discover unified.db connection
 */
export function getDiscoverDb(): Database.Database | null {
  return getDb(DISCOVER_DB);
}

/**
 * Find OpenClaw session SQLite databases
 */
export function findSessionDbs(): string[] {
  const sessionDir = path.join(OPENCLAW_DIR, 'sessions');
  if (!fs.existsSync(sessionDir)) return [];
  
  return fs.readdirSync(sessionDir)
    .filter(f => f.endsWith('.db') || f.endsWith('.sqlite'))
    .map(f => path.join(sessionDir, f));
}
