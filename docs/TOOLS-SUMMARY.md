# Tools Summary — Lead Gate

> Plain-English reference of every tool in this repo and what it's for.
> Skim this before the demo to refresh the names and roles.

---

## 🤖 AI tools (the headline ones)

| Tool | What it does | When you use it |
|---|---|---|
| **GitHub Copilot** | Inline code completion (Tab) | While typing |
| **Copilot Chat / Agent** | Multi-file edits, runs terminal | Building features |
| **`copilot-instructions.md`** | Repo "constitution" — AI reads it every turn | Always on (auto-loaded) |
| **Skills** (`SKILL.md` files) | On-demand reusable workflows | Type `/skill-name` |
| **MCP servers** | Lets AI call GitHub / Supabase / browser safely | Configured once, used by Agent |
| **CodeRabbit** | AI code review on every PR | After you push |
| **SonarLint** | Real-time security/quality lint in editor | While typing |
| **Snyk** | Dependency CVE scanner in editor | While typing + CI |

---

## 🛠️ Build & quality tools

| Tool | Purpose |
|---|---|
| **Next.js 15** | The web framework — pages, Server Actions, routing |
| **TypeScript (strict)** | Type safety — compiler catches bugs before runtime |
| **Tailwind v4** | Utility-first styling — no CSS files to maintain |
| **Zod** | Runtime input validation at the Server Action boundary |
| **Vitest** | Fast unit-test runner for the pure rule (13 tests) |
| **ESLint 9** | Catches bad patterns (`any`, missing returns, etc.) |
| **Prettier** | Auto-formats code on save |

---

## 🔒 Security tools

| Tool | Purpose |
|---|---|
| **Husky** | Runs hooks on `git commit` (gates everything else) |
| **lint-staged** | Runs Prettier + ESLint only on files you're committing |
| **`scripts/check-secrets.mjs`** | Custom zero-dep scanner — refuses commits with leaked keys (JWTs, `sb_secret_…`, AWS, GitHub, OpenAI, Stripe, PEM) |
| **Gitleaks** | CI version of the above — scans full git history |
| **Dependabot** | Auto-PRs for dependency updates + CVE patches |
| **GitHub Actions CI** | Runs typecheck + lint + tests + secrets every PR |

---

## 🗄️ Data tools

| Tool | Purpose |
|---|---|
| **Supabase Postgres** | Cloud Postgres database (production path) |
| **Supabase RLS** | Row-Level Security — second line of defence on tenant data |
| **In-memory store** | Dev fallback so the app works without `.env.local` |
| **`server-only` package** | Build-fails if anyone imports the secret-key client into the browser |

---

## 🧠 Mental model — how the gates fit together

```
┌─────────────────────────────────────────────────────────────┐
│  AI tells Copilot/Cursor HOW to behave:                     │
│   • copilot-instructions.md   (always-on rules)             │
│   • SKILL.md files            (on-demand workflows)         │
│   • .vscode/mcp.json          (which external tools)        │
│   • .coderabbit.yaml          (PR review focus)             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  YOU write code with AI assistance                          │
│   • Copilot completion · SonarLint warnings · Snyk hints    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Pre-commit GATE refuses bad commits                        │
│   • Prettier + ESLint     (lint-staged)                     │
│   • Secret scanner        (check-secrets.mjs)               │
│   • Type check            (tsc)                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  CI GATE refuses bad PRs                                    │
│   • All of the above + Vitest + Gitleaks full-history       │
│   • CodeRabbit posts AI review comments                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                     Merge to main
```

---

## 📚 Skills installed in this repo

| Skill | Source | Trust | Purpose |
|---|---|---|---|
| `lead-qualification` | **You authored it** | Highest | Domain rules for the qualifier — invoke with `/lead-qualification` |
| `find-skills` | `vercel-labs/skills` (vendored) | High (Vercel official, no scripts) | Discover other skills via `npx skills find …` |

### Optional — recommended next adds (verified safe, no scripts)

| Skill | Install command | Why |
|---|---|---|
| `grill-me` | `npx skills add mattpocock/skills@grill-me -y` | Stress-test plans before coding — biggest demo-narrative win |
| `react-best-practices` | `npx skills add vercel-labs/agent-skills@react-best-practices -y` | Vercel's own React/Next.js guidelines (185K installs) |

### Skill installation safety checklist

Before installing any skill:

1. ✅ Read the full `SKILL.md`
2. ✅ Read every file under `scripts/` if present — they execute with shell permissions
3. ✅ Check the source reputation:
   - **Highest:** you wrote it
   - **High:** official vendor orgs (`vercel-labs`, `anthropics`, `supabase`, `microsoft`)
   - **Medium:** known authors (`mattpocock`, etc.)
   - **Low:** random npm packages — review in a sandbox first
4. ✅ Prefer skills with **no `scripts/` folder** for first installs
5. ✅ Vendor skills into the repo (commit them) so reviewers can audit them

---

## 🧰 VS Code extensions auto-suggested by this repo

When a teammate clones and opens the folder, VS Code prompts them to install all of these (defined in `.vscode/extensions.json`):

| Extension | Role |
|---|---|
| GitHub Copilot + Copilot Chat | AI completion + agent |
| SonarLint | Real-time code quality + security |
| CodeRabbit | AI PR review (ties into `.coderabbit.yaml`) |
| Snyk | Dependency vulnerability scan |
| GitLens | Git history + blame |
| Error Lens | Inline diagnostics |
| Tailwind CSS IntelliSense | Class autocomplete |
| EditorConfig | Cross-editor consistency |
| Prettier | Auto-format |
| ESLint | Real-time lint |
| Code Spell Checker | Catches typos in identifiers + docs |

---

## 🔑 Supabase API keys — naming reference

Supabase changed key names in late 2024. Map these correctly:

| Dashboard label | Old name | Goes into `.env.local` as | Format |
|---|---|---|---|
| **Project URL** | (same) | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| **Publishable key** | "anon / public" | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` (or legacy `eyJ…`) |
| **Secret key** | "service_role" | `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` (or legacy `eyJ…`) — **server only** |

If your dashboard shows "REST API URL" like `https://abcd.supabase.co/rest/v1`, just **drop the `/rest/v1`** — that's the Project URL.

---

## 🔄 Where each tool fits in the workflow loop

```
Plan        → Copilot Chat (Plan mode) + grill-me (when added)
grill-me    → /grill-me skill stress-tests the plan
Skill       → /lead-qualification encodes the domain rules
Build       → Copilot Agent + SonarLint + Snyk live in editor
Test        → Vitest (13 cases on the pure rule)
Review      → CodeRabbit on PR + Cursor Agent Review locally
Commit      → Husky → lint-staged → check-secrets → typecheck
CI          → typecheck + lint + test + check-secrets + Gitleaks
Merge       → main
```

---

## 📂 Where to find each artifact

| Artifact | Path |
|---|---|
| Always-on AI rules | `.github/copilot-instructions.md` |
| Authored domain skill | `.github/skills/lead-qualification/SKILL.md` |
| Vendored find-skills | `.github/skills/find-skills/SKILL.md` |
| MCP server config | `.vscode/mcp.json` |
| Recommended extensions | `.vscode/extensions.json` |
| Editor settings | `.vscode/settings.json` |
| AI PR review config | `.coderabbit.yaml` |
| CI workflow | `.github/workflows/ci.yml` |
| Pre-commit hook | `.husky/pre-commit` |
| Secret scanner | `scripts/check-secrets.mjs` |
| Gitleaks config | `.gitleaks.toml` |
| Dependabot config | `.github/dependabot.yml` |
| The qualification rule | `lib/qualifyLead.ts` |
| Tests | `tests/qualifyLead.test.ts` |
| SQL migration | `supabase/migrations/001_leads.sql` |
| Threat model | `docs/SECURITY.md` |
| 8-min demo script | `docs/DEMO-SCRIPT.md` |
| Stack ADR | `docs/ADR-001-stack.md` |
| Tenant isolation ADR | `docs/ADR-002-tenant-isolation.md` |
| Storage fallback ADR | `docs/ADR-003-storage-fallback.md` |
| grill-me transcript ⭐ | `docs/grill-me-qa.md` |

---

## ⚡ TL;DR — what to say in the meeting

> "Lead Gate isn't an AI codegen demo — it's an **AI workflow** demo.
>
> The repo gives Copilot a constitution (the instructions file) and a domain skill I authored. Plan and design get stress-tested by `/grill-me`. The actual rule is one pure function with 13 tests. Every commit goes through a secret scanner; every PR through CodeRabbit; every dependency through Dependabot.
>
> The win isn't 500 generated lines — it's that the repo *itself* enforces the standards, so the next teammate inherits them automatically."
