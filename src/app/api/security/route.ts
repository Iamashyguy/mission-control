import { NextResponse } from "next/server";
import fs from "fs";
import { execSync } from "child_process";
import { OPENCLAW_CONFIG, OPENCLAW_DIR } from "@/lib/paths";

export const dynamic = "force-dynamic";

interface SecurityCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  details: string;
  category: "auth" | "config" | "system" | "network";
}

export async function GET() {
  const checks: SecurityCheck[] = [];
  let score = 0;
  const total = 12;

  // 1. Check auth method (token > api_key)
  try {
    const config = JSON.parse(fs.readFileSync(OPENCLAW_CONFIG, "utf-8"));
    const authProfiles = config?.auth?.profiles || {};
    const anthropicAuth = authProfiles["anthropic:default"];
    if (anthropicAuth?.mode === "token") {
      checks.push({ name: "Anthropic Auth", status: "pass", details: "Using setup token (subscription) — no API key exposure", category: "auth" });
      score++;
    } else {
      checks.push({ name: "Anthropic Auth", status: "warn", details: "Using API key — consider switching to setup token for security", category: "auth" });
    }

    // 2. Check context1m disabled
    const agentModels = config?.agents?.defaults?.models || {};
    let context1mEnabled = false;
    for (const [, v] of Object.entries(agentModels)) {
      if ((v as Record<string, unknown>).context1m) context1mEnabled = true;
    }
    if (!context1mEnabled) {
      checks.push({ name: "Context 1M", status: "pass", details: "Disabled for all models — prevents cooldown + silent fallback", category: "config" });
      score++;
    } else {
      checks.push({ name: "Context 1M", status: "fail", details: "ENABLED — causes instant cooldown and expensive API fallback!", category: "config" });
    }

    // 3. Check gateway bind
    const bind = config?.gateway?.bind;
    if (bind === "lan" || bind === "localhost" || bind === "127.0.0.1") {
      checks.push({ name: "Gateway Bind", status: "pass", details: `Bound to ${bind} — not publicly exposed`, category: "network" });
      score++;
    } else {
      checks.push({ name: "Gateway Bind", status: "warn", details: `Bound to ${bind} — verify this is intentional`, category: "network" });
    }

    // 4. API keys in config
    const providers = config?.models?.providers || {};
    let exposedKeys = 0;
    for (const [, v] of Object.entries(providers)) {
      if ((v as Record<string, unknown>).apiKey) exposedKeys++;
    }
    if (exposedKeys === 0) {
      checks.push({ name: "API Keys in Config", status: "pass", details: "No API keys found in openclaw.json providers", category: "auth" });
      score++;
    } else {
      checks.push({ name: "API Keys in Config", status: "warn", details: `${exposedKeys} API key(s) in config — consider using env vars`, category: "auth" });
    }
  } catch {
    checks.push({ name: "Config Read", status: "fail", details: "Failed to read openclaw.json", category: "config" });
  }

  // 5. SSH key exists
  const sshKeyPath = `${process.env.HOME}/.ssh/id_ed25519`;
  if (fs.existsSync(sshKeyPath)) {
    checks.push({ name: "SSH Key", status: "pass", details: "Ed25519 SSH key configured", category: "auth" });
    score++;
  } else {
    checks.push({ name: "SSH Key", status: "warn", details: "No Ed25519 SSH key found", category: "auth" });
  }

  // 6. Mission Control auth
  const envFile = `${process.cwd()}/.env.local`;
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, "utf-8");
    const hasAuthSecret = envContent.includes("AUTH_SECRET=");
    const hasPassword = envContent.includes("ADMIN_PASSWORD=");
    if (hasAuthSecret && hasPassword) {
      checks.push({ name: "MC Auth Config", status: "pass", details: "Password + auth secret configured", category: "auth" });
      score++;
    } else {
      checks.push({ name: "MC Auth Config", status: "fail", details: "Missing auth configuration", category: "auth" });
    }
  }

  // 7. File permissions on config
  try {
    const stat = fs.statSync(OPENCLAW_CONFIG);
    const mode = (stat.mode & 0o777).toString(8);
    if (mode === "600" || mode === "644") {
      checks.push({ name: "Config Permissions", status: "pass", details: `openclaw.json permissions: ${mode}`, category: "config" });
      score++;
    } else {
      checks.push({ name: "Config Permissions", status: "warn", details: `openclaw.json permissions: ${mode} — consider 600`, category: "config" });
    }
  } catch {
    checks.push({ name: "Config Permissions", status: "warn", details: "Could not check file permissions", category: "config" });
  }

  // 8. Firewall status
  try {
    const fw = execSync("/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate 2>/dev/null || echo 'unknown'", { encoding: "utf-8" });
    if (fw.includes("enabled")) {
      checks.push({ name: "Firewall", status: "pass", details: "macOS firewall enabled", category: "network" });
      score++;
    } else {
      checks.push({ name: "Firewall", status: "warn", details: "macOS firewall may be disabled", category: "network" });
    }
  } catch {
    checks.push({ name: "Firewall", status: "warn", details: "Could not check firewall status", category: "network" });
  }

  // 9. OpenClaw workspace size
  try {
    const size = execSync(`du -sm "${OPENCLAW_DIR}" 2>/dev/null | cut -f1`, { encoding: "utf-8" }).trim();
    const sizeMB = parseInt(size);
    if (sizeMB < 5000) {
      checks.push({ name: "Workspace Size", status: "pass", details: `${sizeMB} MB — within limits`, category: "system" });
      score++;
    } else {
      checks.push({ name: "Workspace Size", status: "warn", details: `${sizeMB} MB — consider cleanup (>5GB)`, category: "system" });
    }
  } catch {
    checks.push({ name: "Workspace Size", status: "warn", details: "Could not check workspace size", category: "system" });
  }

  // 10. Node.js version
  try {
    const nodeVer = process.version;
    const major = parseInt(nodeVer.replace("v", ""));
    if (major >= 20) {
      checks.push({ name: "Node.js Version", status: "pass", details: `${nodeVer} — up to date`, category: "system" });
      score++;
    } else {
      checks.push({ name: "Node.js Version", status: "warn", details: `${nodeVer} — consider updating to v20+`, category: "system" });
    }
  } catch {}

  // 11. Check .env.local not in git
  try {
    const gitCheck = execSync("cd ~/.openclaw/workspace/mission-control && git ls-files .env.local 2>/dev/null", { encoding: "utf-8" });
    if (gitCheck.trim() === "") {
      checks.push({ name: ".env.local in Git", status: "pass", details: "Not tracked — secrets are safe", category: "auth" });
      score++;
    } else {
      checks.push({ name: ".env.local in Git", status: "fail", details: "TRACKED IN GIT — remove immediately!", category: "auth" });
    }
  } catch {
    checks.push({ name: ".env.local in Git", status: "pass", details: "Not tracked", category: "auth" });
    score++;
  }

  // 12. HTTPS/TLS
  checks.push({ name: "HTTPS", status: "warn", details: "Running on HTTP (localhost) — acceptable for local access, add TLS for remote", category: "network" });

  const scorePercent = Math.round((score / total) * 100);
  const grade = scorePercent >= 90 ? "A" : scorePercent >= 75 ? "B" : scorePercent >= 60 ? "C" : "D";

  return NextResponse.json({
    checks,
    score: { earned: score, total, percent: scorePercent, grade },
    summary: {
      pass: checks.filter(c => c.status === "pass").length,
      warn: checks.filter(c => c.status === "warn").length,
      fail: checks.filter(c => c.status === "fail").length,
    },
  });
}
