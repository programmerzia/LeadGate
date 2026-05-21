# Lead Gate

A tiny multi-tenant lead qualification service — built end-to-end with a structured AI-assisted development workflow.

> **Why this repo exists:** to demonstrate *process maturity* with AI tooling (Plan → grill-me → Skill → Build → Test → Review), not to ship a product. The single business rule is taken from a real outreach platform backlog.

[![ci](https://img.shields.io/badge/ci-typecheck%20%C2%B7%20lint%20%C2%B7%20test%20%C2%B7%20secret--scan-22c55e)](.github/workflows/ci.yml)
[![ai](https://img.shields.io/badge/AI-Copilot%20%C2%B7%20Skills%20%C2%B7%20MCP%20%C2%B7%20CodeRabbit-6366f1)](#ai-customization-layer)

---

## The rule

```
IF contact_email is null/empty/whitespace      → excluded (missing_email)
ELSE IF email domain in disposable list         → excluded (disposable_email)
ELSE                                            → outbound_ready
```

Every row carries `tenant_id` (UUID). Reads and writes are tenant-scoped via Supabase Row-Level Security.

---

## Stack

- **Next.js 15** (App Router, Server Actions) + **TypeScript** strict
- **Supabase** Postgres + RLS — *or* an in-memory dev fallback (auto-detected)
- **Vitest** for the pure logic (13 cases)
- **Tailwind v4** — gradient hero, dark mode, glass cards, animated states
- **Zod** input validation at the Server Action boundary

---

## AI customization layer

| Artifact | Role |
|---|---|
| `.github/copilot-instructions.md` | Always-on rules — Copilot/Cursor read it every turn |
| `.github/skills/lead-qualification/SKILL.md` | **Authored** domain skill — invoke with `/lead-qualification` |
| `.coderabbit.yaml` | AI PR review configured for *this* domain (tenant filter, PII rules) |
| `.vscode/mcp.json` | MCP servers — GitHub now, Supabase later (tokens via prompt) |
| `.vscode/extensions.json` | Auto-prompts new clones to install Copilot, SonarLint, CodeRabbit, Snyk, GitLens, Error Lens, Tailwind, Spell Checker |
| `.vscode/settings.json` | Format-on-save, ESLint fix-on-save, Copilot uses the instructions file |

---

## Quality & security gates

| Gate | Tool | When |
|---|---|---|
| Strict TypeScript | `tsc --noEmit` (with `noUncheckedIndexedAccess`) | typecheck script + CI |
| Lint | ESLint 9 flat config + Next.js + custom rules | `npm run lint` + pre-commit + CI |
| Format | Prettier | pre-commit (lint-staged) |
| Unit tests | Vitest | `npm test` + CI |
| Local secret scan | `scripts/check-secrets.mjs` (zero-dep, JWT/AWS/GH/OpenAI/Anthropic/Stripe/PEM) | pre-commit + CI |
| Full-history secret scan | Gitleaks Action | CI |
| Dependency CVEs | Dependabot weekly | GitHub |
| AI code review | CodeRabbit (.coderabbit.yaml) | PRs |
| Real-time IDE | SonarLint + Error Lens + Snyk | While coding |

`npm run verify` runs the local subset (typecheck + lint + tests + secret-scan).

---

## Quick start

```sh
# from G:\AI Demo\LeadGate
npm install
npm run dev          # http://localhost:3000  ← runs WITHOUT Supabase (in-memory)
npm test             # 13 tests in ~150 ms
npm run verify       # the full local gate
```

### Add Supabase later (zero code change)

```sh
copy .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
# apply supabase/migrations/001_leads.sql via Supabase Dashboard → SQL Editor
npm run dev
# the backend badge in the UI flips from "In-memory (dev)" to "Supabase"
```

### Activate the security hooks

```sh
npx husky init   # one-time, registers .husky/pre-commit
git add . && git commit -m "test"
# pre-commit runs: lint-staged → secret-scan → typecheck
```

---

## Project structure

```
LeadGate/
├── app/
│   ├── actions/
│   │   └── leads.ts            Server Actions (Zod → qualifyLead → store)
│   ├── components/
│   │   ├── Dashboard.tsx       client composer (tenant switch, refresh)
│   │   ├── LeadForm.tsx        useActionState form with field errors
│   │   ├── LeadList.tsx        masked-email cards + empty state
│   │   ├── LeadResult.tsx      red/green decision panel
│   │   ├── Stats.tsx           total · ready · excluded
│   │   ├── StatusBadge.tsx     pill with tone + reason
│   │   └── TenantSelector.tsx  tab pill switcher
│   ├── globals.css             Tailwind v4 import + theme vars
│   ├── layout.tsx
│   └── page.tsx                Server Component, gradient hero
├── lib/
│   ├── disposable-domains.ts   readonly Set + isDisposableEmail
│   ├── qualifyLead.ts          THE rule (pure)
│   ├── tenants.ts              demo allowlist + accent colours
│   ├── types.ts                shared domain types
│   ├── store/
│   │   ├── index.ts            getStore() — auto-picks backend
│   │   ├── memory.ts           in-memory fallback
│   │   ├── supabase.ts         tenant-filtered queries
│   │   └── types.ts            LeadStore contract
│   └── supabase/
│       └── server.ts           service-role client (server-only)
├── tests/
│   └── qualifyLead.test.ts     13 cases: missing/disposable/ready/purity
├── supabase/
│   └── migrations/
│       └── 001_leads.sql       table + enums + RLS deny-baseline
├── scripts/
│   └── check-secrets.mjs       zero-dep pre-commit secret scanner
├── docs/
│   ├── ADR-001-stack.md
│   ├── ADR-002-tenant-isolation.md
│   ├── ADR-003-storage-fallback.md
│   ├── grill-me-qa.md          ⭐ headline doc — design changes from grilling
│   ├── DEMO-SCRIPT.md          8-min narration with timings
│   └── SECURITY.md             threat model + posture
├── .github/
│   ├── copilot-instructions.md
│   ├── skills/lead-qualification/SKILL.md
│   ├── workflows/ci.yml        verify + gitleaks
│   ├── dependabot.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── .husky/pre-commit
├── .vscode/{mcp.json, settings.json, extensions.json}
├── .coderabbit.yaml
├── .gitleaks.toml
├── .prettierrc.json · .prettierignore · .editorconfig
├── eslint.config.mjs · next.config.ts · postcss.config.mjs
├── tsconfig.json · vitest.config.ts
└── package.json
```

---

## What to show in the demo (8 min)

See `docs/DEMO-SCRIPT.md`. Beats:

1. **30 s — Hook.** "Process, not codegen."
2. **60 s — 4 layers.** instructions / skill / agents / MCP — open the files.
3. **60 s — grill-me.** Two ⚡ moments in `docs/grill-me-qa.md` that changed the design.
4. **90 s — Tests.** `npm test`, 13 green in 150 ms.
5. **90 s — Live UI.** Empty email → red. Mailinator → red. Real email → green. Switch tenant → list resets.
6. **60 s — CodeRabbit.** Show one Must fix that you applied.
7. **45 s — Pre-commit.** Paste a fake JWT, watch the commit get rejected.
8. **45 s — Bridge.** "Same workflow on the real backlog tomorrow."

---

## Security non-negotiables

Full threat model in `docs/SECURITY.md`. Highlights:

- `.env*` git-ignored; **never** paste secrets into AI chat
- Service-role key read **only** in `lib/supabase/server.ts` (`server-only` import)
- Every DB query filters by `tenant_id`; RLS deny-all baseline at the database
- No PII (full email) in logs / errors; UI masks emails (`f***@acme.no`)
- AI-generated SQL reviewed before running against any database
- MCP tokens via VS Code prompts, never in repo

---

## Build status

- [x] **Step 2** — AI customization layer
- [x] **Step 3** — Project scaffold
- [x] **Step 4** — Pure logic + 13 tests + RLS migration
- [x] **Step 5** — Storage abstraction + Server Actions + polished UI
- [x] **Step 6** — Husky + lint-staged + Prettier + secret scanner + Gitleaks + CI + CodeRabbit + Dependabot
- [x] **Step 7** — 3 ADRs + grill-me transcript + 8-min demo script + SECURITY.md

Next: paste your Supabase URL + service role key into `.env.local`, run the SQL migration in the Supabase SQL editor, and the app flips from "In-memory" to "Supabase" with no code changes.
