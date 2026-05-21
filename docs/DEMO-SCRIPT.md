# Demo script — Lead Gate (8 minutes)

> Goal: convince the room that AI-assisted development is a **disciplined process**, not a code-generation race. The app is a vehicle for that story.

---

## Pre-flight (do **before** you walk in)

- [ ] `.env.local` filled in (Supabase keys), or accept the in-memory mode
- [ ] Run `npm run dev` and submit one warm-up lead (free-tier wake-up)
- [ ] Run `npm run verify` — green
- [ ] VS Code open with `lib/qualifyLead.ts` and `docs/grill-me-qa.md` in tabs
- [ ] Browser open: app at `http://localhost:3000`, Supabase Studio in second tab
- [ ] Terminal split into two panes: one for `npm test`, one for `git commit`
- [ ] Phone on silent

---

## 0:00 — Hook (30 s)

> "Most AI demos show how many lines were generated. I'd rather show you the process — because in a real team that's what protects you. Same workflow on a tiny app today, same workflow on the outreach platform Phase Alpha tomorrow."

Open the README. Point at the workflow loop:

```
Plan → grill-me → Skill → Build → Test → Review
```

---

## 0:30 — The 4-layer customization model (60 s)

Open `.github/copilot-instructions.md` in VS Code:

> "This file is loaded by Copilot on **every** turn. It tells the AI our architecture, our security non-negotiables, and the workflow it must follow. The AI doesn't behave randomly because the repo gives it a constitution."

Open `.github/skills/lead-qualification/SKILL.md`:

> "This is a **skill** I authored. On-demand, invoked with `/lead-qualification`. It encodes the domain rule and the review checklist. Most candidates *install* skills. Authoring one is the differentiator."

Mention `.vscode/mcp.json`:

> "MCP servers — how the AI safely talks to GitHub, Supabase, Playwright. Tokens via VS Code prompts, never in repo."

---

## 1:30 — grill-me transcript (60 s)

Open `docs/grill-me-qa.md`. Scroll to the ⚡ markers.

> "Before any code, I had the AI grill my plan. Two answers materially changed the design — Q2 added the disposable-email rule because the demo would have looked broken without it, and Q3 closed the tenant allowlist because 'add a tenant_id field' isn't actually multi-tenancy."

Point at the table at the bottom — five concrete design changes traced back to grilling.

---

## 2:30 — The rule, with tests (90 s)

Open `lib/qualifyLead.ts`:

> "The rule is one pure function, ~15 lines. No I/O. No `Date.now()`. Same input always returns the same output. Why does that matter? Because of this:"

Switch to terminal pane 1:

```
npm test
```

Show 13 green tests in ~150 ms.

> "Cheaper than a smoke test, and it locks down every edge case the rule cares about — including the `notmailinator.com` guard, which catches the most common AI regression: substring matching."

---

## 4:00 — Live UI (90 s)

Switch to browser:

1. **Tenant A is selected.** Submit `Acme Corp` with **no email**. → Red panel: *Excluded — missing email · Kept for enrichment*. Stats counter increments.
2. Submit `Acme Corp` with `user@mailinator.com`. → Red panel: *Excluded — disposable email*.
3. Submit `Acme Corp` with `founder@acme.no`. → **Green panel**: *Outbound ready*. Recent-leads list shows three rows.
4. **Switch to Tenant B.** List goes empty. Stats reset to 0.

> "Multi-tenancy is visible in two seconds. Every query has `.eq('tenant_id', ...)` — and on top of that, RLS at the database is a deny-baseline second line of defence."

(If on real Supabase: switch to Studio tab, show RLS enabled on `leads`, show three rows for tenant A.)

---

## 5:30 — AI review on a real diff (60 s)

> "I committed earlier with a small refactor — let me show you what the AI review caught."

Open the GitHub PR (or local CodeRabbit panel). Point at one **Must fix** and one **Should fix** finding. Show the commit that resolved them.

> "CodeRabbit's review is shaped by `.coderabbit.yaml` in the repo — I told it to flag any query missing the tenant filter and any PII leaking into errors. The review stays on-topic for *our* domain."

---

## 6:30 — Pre-commit hook rejects a fake secret (45 s)

Switch to terminal pane 2. Open a tracked file. Paste a fake JWT-shaped string at the bottom:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.fake-signature-here-do-not-use
```

`git add . && git commit -m "demo"` → **commit is rejected**.

```
✗ secret-scan FAILED — 1 possible secret(s):
  • app/page.tsx:42  Supabase service role / anon JWT
```

> "That's the local guard. Same file in CI runs Gitleaks across full history. The lift to add this to any repo is one Husky hook + one mjs file — no SaaS dependency."

Discard the change.

---

## 7:15 — Bridge to the real backlog (45 s)

Open the original PDF backlog briefly.

> "Same pipeline scales: PDF Phase Alpha → Plan mode → grill-me → ADRs → SKILL files for tenant rules / lead state machine / webhook signatures → build → CodeRabbit before merge. Nothing in this demo is throwaway. The four customization layers, the security gates, and the test discipline transfer one-for-one."

---

## 8:00 — Close

> "Three things I want you to take away:
> 1. AI didn't write this — AI **stress-tested** the design and **executed** the plan.
> 2. The repo *itself* enforces the standards, so the next teammate inherits them automatically.
> 3. The security posture is visible: server-only secrets, tenant filter on every query, RLS deny-baseline, secret scan on every commit, AI review on every PR."

Stop. Don't fill silence.

---

## Q&A — likely questions and tight answers

| Question | Answer |
|---|---|
| "Couldn't the AI have written the rule wrong?" | Yes — that's why the SKILL.md fixes the contract and 13 tests cover it. AI errors become test failures. |
| "Why service-role + RLS deny instead of anon + RLS allow?" | ADR-002. Demo has no auth. Service-role server-only is the simplest secure posture; migration to real auth is a one-function swap. |
| "What if the AI hallucinates an API?" | Context7 MCP gives it real docs. Grill-me catches design hallucinations before code. CodeRabbit catches code-level ones at the PR. |
| "Cost of running this in CI?" | The local pre-commit hook is free. Gitleaks-action is free. CodeRabbit free for OSS, paid for private. SonarLint free in IDE. |
| "How do we onboard a new dev?" | Clone, `npm install`, VS Code prompts to install all extensions from `.vscode/extensions.json`. The instructions file does the rest. |

---

## If something breaks live

- **Supabase asleep / 500 error** → don't panic. App auto-falls back to in-memory. Point at the **backend badge** flipping to "In-memory (dev)". Continue. The story still works.
- **Test fails on stage** → don't fix on stage. Say "I'd raise that as a regression and run grill-me on the proposed fix." Move on.
- **Network down** → in-memory mode runs offline. Skip the Supabase Studio tab.
