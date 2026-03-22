import path from 'path';

/**
 * Centralized path configuration for Mission Control.
 * Reads from OPENCLAW_DIR env var, defaults to ~/.openclaw on macOS.
 */
export const OPENCLAW_DIR = process.env.OPENCLAW_DIR || path.join(process.env.HOME || '/root', '.openclaw');
export const OPENCLAW_WORKSPACE = path.join(OPENCLAW_DIR, 'workspace');
export const OPENCLAW_CONFIG = path.join(OPENCLAW_DIR, 'openclaw.json');
export const OPENCLAW_LOGS = path.join(OPENCLAW_DIR, 'logs');
export const OPENCLAW_MEDIA = path.join(OPENCLAW_DIR, 'media');

// Workspace files
export const WORKSPACE_IDENTITY = path.join(OPENCLAW_WORKSPACE, 'IDENTITY.md');
export const WORKSPACE_MEMORY = path.join(OPENCLAW_WORKSPACE, 'memory');
export const WORKSPACE_CONTEXT = path.join(OPENCLAW_WORKSPACE, 'context.md');
export const WORKSPACE_DECISIONS = path.join(OPENCLAW_WORKSPACE, 'decisions.md');

// Discover workspace
export const DISCOVER_WORKSPACE = path.join(OPENCLAW_DIR, 'workspace-discover');
export const DISCOVER_DB = path.join(DISCOVER_WORKSPACE, 'data', 'unified.db');
export const DISCOVER_STATUS = path.join(DISCOVER_WORKSPACE, 'status.json');

// Skills paths
export const SYSTEM_SKILLS_PATH = '/opt/homebrew/lib/node_modules/openclaw/skills';
export const WORKSPACE_SKILLS_PATH = path.join(OPENCLAW_WORKSPACE, 'skills');
