#!/usr/bin/env node
/**
 * scripts/check-secrets.mjs
 *
 * Lightweight, dependency-free secret scanner used by the pre-commit hook.
 * NOT a replacement for Gitleaks / TruffleHog in CI — this is a fast,
 * deterministic local guard that catches the most common leak patterns.
 *
 * Behaviour:
 *   • Scans staged files (when run from a git pre-commit hook) OR all
 *     tracked files when run standalone with `node scripts/check-secrets.mjs`.
 *   • Skips obvious non-source paths (node_modules, .next, lockfiles, .env*).
 *   • Allows lines containing  `pragma: allowlist secret`  for documented
 *     placeholders (use sparingly).
 *
 * Exit codes:
 *   0 — clean
 *   1 — secret-shaped string found (commit is rejected)
 *   2 — internal error
 */

import { execSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";

const PATTERNS = [
  {
    name: "Supabase service role / anon JWT (eyJ-prefixed JWT)",
    re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
  },
  {
    name: "Supabase secret key (new sb_secret_ format)",
    re: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: "Supabase publishable key (new sb_publishable_ format) — usually safe but flag in non-env files",
    re: /\bsb_publishable_[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: "AWS access key id",
    re: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: "AWS secret access key (heuristic)",
    re: /\baws_secret_access_key\s*[:=]\s*['"][A-Za-z0-9/+=]{40}['"]/i,
  },
  {
    name: "GitHub fine-grained / classic token",
    re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  },
  {
    name: "OpenAI API key",
    re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: "Anthropic API key",
    re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: "Google API key",
    re: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    name: "Stripe secret key",
    re: /\bsk_(?:test|live)_[A-Za-z0-9]{16,}\b/,
  },
  {
    name: "Generic private key block",
    re: /-----BEGIN (?:RSA|EC|DSA|OPENSSH|PGP) PRIVATE KEY-----/,
  },
];

const SKIP_PREFIX = [
  "node_modules/",
  ".next/",
  "coverage/",
  "dist/",
  "out/",
  ".vitest/",
];

const SKIP_FILE = [
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
];

const SKIP_EXT = new Set([
  ".lock",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".pdf",
  ".ico",
  ".woff",
  ".woff2",
]);

const ALLOWLIST_TAG = "pragma: allowlist secret";

function gitOut(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function getStagedFiles() {
  const out = gitOut("git diff --cached --name-only --diff-filter=ACMR");
  return out ? out.split("\n").filter(Boolean) : [];
}

function getTrackedFiles() {
  const out = gitOut("git ls-files");
  return out ? out.split("\n").filter(Boolean) : [];
}

function shouldScan(path) {
  if (SKIP_PREFIX.some((p) => path.startsWith(p))) return false;
  if (SKIP_FILE.includes(path) || SKIP_FILE.includes(path.split("/").pop()))
    return false;
  const dot = path.lastIndexOf(".");
  if (dot >= 0 && SKIP_EXT.has(path.slice(dot))) return false;
  try {
    const s = statSync(path);
    if (!s.isFile()) return false;
    if (s.size > 1024 * 1024) return false; // skip files > 1MB
  } catch {
    return false;
  }
  return true;
}

function scanFile(path) {
  const findings = [];
  let content;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return findings;
  }
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes(ALLOWLIST_TAG)) continue;
    for (const p of PATTERNS) {
      if (p.re.test(line)) {
        findings.push({
          path,
          line: i + 1,
          name: p.name,
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  }
  return findings;
}

function main() {
  const staged = getStagedFiles();
  const files = (staged.length ? staged : getTrackedFiles()).filter(shouldScan);

  const findings = [];
  for (const f of files) findings.push(...scanFile(f));

  if (findings.length === 0) {
    console.log(`✓ secret-scan clean (${files.length} file(s) scanned)`);
    process.exit(0);
  }

  console.error(
    `\n✗ secret-scan FAILED — ${findings.length} possible secret(s):\n`,
  );
  for (const f of findings) {
    console.error(`  • ${f.path}:${f.line}  ${f.name}`);
    console.error(`    ${f.snippet}\n`);
  }
  console.error(
    "If this is a false positive, append  // pragma: allowlist secret  to the line.",
  );
  console.error(
    "Otherwise: rotate the credential, remove from history, and commit again.\n",
  );
  process.exit(1);
}

try {
  main();
} catch (err) {
  console.error("check-secrets internal error:", err);
  process.exit(2);
}
