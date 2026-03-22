import { NextRequest, NextResponse } from 'next/server';
import { logActivity, getActivities } from '@/lib/activities-db';
import fs from 'fs';
import path from 'path';
import { OPENCLAW_LOGS, OPENCLAW_WORKSPACE } from '@/lib/paths';

// Track last parsed position to avoid re-parsing
let lastLogSize = 0;
let lastSeedTime = 0;
const SEED_INTERVAL = 60_000; // Re-seed from logs every 60 seconds

/**
 * Parse gateway.log and seed activities DB
 */
function seedFromGatewayLog() {
  const now = Date.now();
  if (now - lastSeedTime < SEED_INTERVAL) return;
  lastSeedTime = now;

  const logPath = path.join(OPENCLAW_LOGS, 'gateway.log');
  if (!fs.existsSync(logPath)) return;

  try {
    const stat = fs.statSync(logPath);
    const currentSize = stat.size;
    
    // Read new content since last parse (or last 50KB on first run)
    const readStart = lastLogSize > 0 ? lastLogSize : Math.max(0, currentSize - 50_000);
    const readSize = currentSize - readStart;
    if (readSize <= 0) return;

    const fd = fs.openSync(logPath, 'r');
    const buf = Buffer.alloc(Math.min(readSize, 100_000));
    fs.readSync(fd, buf, 0, buf.length, readStart);
    fs.closeSync(fd);
    lastLogSize = currentSize;

    const content = buf.toString('utf-8');
    const lines = content.split('\n').filter(l => l.trim());

    for (const line of lines) {
      // Parse timestamp
      const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+[+-]\d{2}:\d{2})/);
      if (!tsMatch) continue;
      const timestamp = tsMatch[1];

      // Telegram message sent
      if (line.includes('[telegram] sendMessage ok')) {
        const chatMatch = line.match(/chat=(\d+)\s+message=(\d+)/);
        logActivity('message', `Telegram message sent${chatMatch ? ` (msg #${chatMatch[2]})` : ''}`, 'success', {
          agent: 'main',
          metadata: { channel: 'telegram', chat: chatMatch?.[1], messageId: chatMatch?.[2] },
          timestamp,
        });
      }
      // Cron execution
      else if (line.includes('[cron]') && (line.includes('started') || line.includes('complete'))) {
        const cronMatch = line.match(/\[cron\]\s+(.+)/);
        const isComplete = line.includes('complete');
        logActivity('cron', cronMatch?.[1] || 'Cron job', isComplete ? 'success' : 'running', {
          agent: 'system',
          timestamp,
        });
      }
      // Session events
      else if (line.includes('[session]') && (line.includes('created') || line.includes('completed'))) {
        const sessionMatch = line.match(/\[session\]\s+(.+)/);
        logActivity('session', sessionMatch?.[1] || 'Session event', 'success', {
          agent: 'main',
          timestamp,
        });
      }
      // WebSocket connections
      else if (line.includes('[ws]') && line.includes('⇄ res ✓')) {
        const wsMatch = line.match(/✓\s+(\S+)\s+(\d+)ms/);
        if (wsMatch) {
          logActivity('api', `WS: ${wsMatch[1]} (${wsMatch[2]}ms)`, 'success', {
            agent: 'system',
            duration_ms: parseInt(wsMatch[2]),
            timestamp,
          });
        }
      }
      // WebSocket errors (skip repetitive scope errors)
      else if (line.includes('[ws]') && line.includes('⇄ res ✗')) {
        // Skip "missing scope: operator.read" — these are benign and flood the feed
        if (line.includes('missing scope:')) continue;
        const errMatch = line.match(/✗\s+(\S+)\s+.*errorMessage=(.+?)(?:\s+conn=|$)/);
        if (errMatch) {
          logActivity('api', `WS Error: ${errMatch[1]} — ${errMatch[2]}`, 'error', {
            agent: 'system',
            timestamp,
          });
        }
      }
      // Health monitor events
      else if (line.includes('[health-monitor]')) {
        const hmMatch = line.match(/\[health-monitor\]\s+(.+)/);
        logActivity('health', hmMatch?.[1] || 'Health check', line.includes('restarting') ? 'error' : 'success', {
          agent: 'system',
          timestamp,
        });
      }
      // Agent model errors
      else if (line.includes('[ERROR]') || line.includes('error')) {
        const level = line.includes('[ERROR]') ? 'error' : 'error';
        logActivity('error', line.replace(/^.*?\]\s*/, '').slice(0, 200), level, {
          agent: 'system',
          timestamp,
        });
      }
    }
  } catch (err) {
    console.error('Failed to seed activities from gateway log:', err);
  }
}

/**
 * Seed from cron runs (openclaw cron list output)
 */
function seedFromCronStatus() {
  try {
    const { execSync } = require('child_process');
    const output = execSync('openclaw cron list --json 2>/dev/null', { timeout: 5000 }).toString();
    const crons = JSON.parse(output);
    
    if (Array.isArray(crons)) {
      for (const cron of crons) {
        if (cron.lastRun) {
          logActivity('cron', `${cron.name || cron.id}: ${cron.lastStatus || 'completed'}`, 
            cron.lastStatus === 'error' ? 'error' : 'success', {
            agent: cron.agent || 'main',
            timestamp: cron.lastRun,
          });
        }
      }
    }
  } catch {
    // openclaw cron list may not support --json, that's fine
  }
}

/**
 * Seed from recent memory files (today's activities)
 */
function seedFromMemory() {
  const today = new Date().toISOString().split('T')[0];
  const memFile = path.join(OPENCLAW_WORKSPACE, 'memory', `${today}.md`);
  
  if (!fs.existsSync(memFile)) return;
  
  try {
    const content = fs.readFileSync(memFile, 'utf-8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Look for logged events like "- [HH:MM] Something happened"
      const eventMatch = line.match(/^-\s+\[?(\d{1,2}:\d{2})\]?\s+(.+)/);
      if (eventMatch) {
        logActivity('memory', eventMatch[2].slice(0, 200), 'success', {
          agent: 'main',
          timestamp: `${today}T${eventMatch[1]}:00+05:30`,
        });
      }
    }
  } catch {}
}

export async function GET(request: NextRequest) {
  try {
    // Auto-seed from gateway logs on each request
    seedFromGatewayLog();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const agent = searchParams.get('agent') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const sort = (searchParams.get('sort') || 'newest') as 'newest' | 'oldest';
    const format = searchParams.get('format') || 'json';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), format === 'csv' ? 10000 : 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = getActivities({ type, status, agent, startDate, endDate, sort, limit, offset });

    if (format === 'csv') {
      const header = 'id,timestamp,type,description,status,duration_ms,tokens_used,agent\n';
      const rows = result.activities.map((a) => [
        a.id, a.timestamp, a.type,
        `"${(a.description || '').replace(/"/g, '""')}"`,
        a.status, a.duration_ms ?? '', a.tokens_used ?? '',
        a.agent ?? '',
      ].join(',')).join('\n');
      return new NextResponse(header + rows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="activities-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    return NextResponse.json({
      activities: result.activities,
      total: result.total,
      limit,
      offset,
      hasMore: offset + limit < result.total,
    });
  } catch (error) {
    console.error('Failed to get activities:', error);
    return NextResponse.json({ error: 'Failed to get activities' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.type || !body.description || !body.status) {
      return NextResponse.json(
        { error: 'Missing required fields: type, description, status' },
        { status: 400 }
      );
    }

    const validStatuses = ['success', 'error', 'pending', 'running'];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    const activity = logActivity(body.type, body.description, body.status, {
      duration_ms: body.duration_ms ?? null,
      tokens_used: body.tokens_used ?? null,
      agent: body.agent ?? null,
      metadata: body.metadata ?? null,
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Failed to save activity:', error);
    return NextResponse.json({ error: 'Failed to save activity' }, { status: 500 });
  }
}
