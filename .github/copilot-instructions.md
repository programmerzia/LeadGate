# Lead Gate — Copilot / AI Agent Instructions

These instructions are loaded automatically by GitHub Copilot (VS Code) and Cursor on every turn.
They define **how code is written in this repo**. The agent must follow them without being asked.

---

## 1. Project context

**Lead Gate** is a tiny multi-tenant lead qualification service used as an AI-assisted development demo.
It implements one business rule end-to-end with full security, tests, and review gates.

**Stack (do not change without an ADR):**

- Next.js 15 (App Router) + TypeScript (strict)
- Supabase (Postgres + Row-Level Security)
- Vitest for unit tests
- Tailwind CSS for styling
- Server Actions for mutations (no public route handlers unless required)

---

## 2. Architecture rules

1. **Pure logic lives in `lib/`** — must be framework-free and unit-testable without mocks.
   - Example: `lib/qualifyLead.ts` is a pure function. Tests import it directly.
2. **Server Actions live in `app/actions/`** — they orchestrate: validate input → call pure logic → write to Supabase.
3. **UI components live in `app/`** — never call Supabase directly from a Client Component.
4. **Database access is server-only.** Import `lib/supabase/server.ts`. There is **no** browser-side Supabase client in this project.
5. **Migrations live in `supabase/migrations/`** as numbered SQL files. Never mutate the schema from application code.

---

## 3. Multi-tenancy (security-critical)

- Every domain row has a `tenant_id uuid not null`.
- Every read **and** every write must filter by `tenant_id`.
- Row-Level Security is **enabled** on all tenant-scoped tables.
- The Server Action receives `tenant_id` from a trusted source (form input for the demo; in real life from session). It must validate the UUID before any DB call.
- **Never** rely solely on the client to enforce tenant scope — always re-check server-side.

---

## 4. The qualification rule (single source of truth)

```
Input:  { tenant_id, company_name, contact_email, org_number? }

Rule:
  IF contact_email is null OR empty after trim
    -> { status: "excluded", exclusion_reason: "missing_email" }
  ELSE IF email domain matches DISPOSABLE_DOMAINS
    -> { status: "excluded", exclusion_reason: "disposable_email" }
  ELSE
    -> { status: "outbound_ready", exclusion_reason: null }
```

The function `qualifyLead()` in `lib/qualifyLead.ts` is the **only** place this rule lives.
The Server Action and UI must not reimplement it.

---

## 5. Validation & input handling

- Validate all external input with **Zod** at the Server Action boundary.
- Reject unknown fields (`.strict()`).
- Trim strings before validation.
- `tenant_id` must pass `z.string().uuid()`.
- `contact_email`, when present, must pass `z.string().email()` — but an absent/empty email is **valid input** that produces an "excluded" outcome (it is not a validation error).

---

## 6. Security non-negotiables

- **Never** log or echo back: API keys, JWTs, service-role keys, full email addresses in error messages, raw request bodies.
- **Never** use `SUPABASE_SERVICE_ROLE_KEY` outside `lib/supabase/server.ts`.
- **Never** put any secret in code, comments, commit messages, chat, or markdown.
- `.env.local`, `.env*` are git-ignored. The example file is `.env.local.example`.
- All AI-generated SQL must be reviewed by a human before running against any database.
- Webhook/HTTP handlers (if added later) must verify signatures and reject on missing/invalid.

---

## 7. Testing rules

- Every pure function in `lib/` has a Vitest test file in `tests/`.
- The qualification function must have at minimum these cases:
  1. `contact_email = undefined` → excluded / missing_email
  2. `contact_email = "   "` (whitespace) → excluded / missing_email
  3. `contact_email = "user@mailinator.com"` → excluded / disposable_email
  4. `contact_email = "founder@acme.no"` → outbound_ready
- Tests do **not** hit the network, the database, or the file system.
- Run with `npm test`. Tests must pass before commit.

---

## 8. Code style

- TypeScript `strict: true`. No `any` — use `unknown` and narrow.
- Prefer `type` over `interface` for data shapes; `interface` only for class contracts.
- No default exports for utilities. Default exports allowed for Next.js page/layout files.
- Imports ordered: node builtins → external → internal (`@/lib/...`) → relative → styles.
- File names: `kebab-case.ts` for libs, `PascalCase.tsx` for components, `camelCase.ts` for actions.
- Functions ≤ 40 lines; files ≤ 200 lines. If exceeded, refactor before continuing.

---

## 9. Workflow the agent must follow

When asked to implement a change, the agent must:

1. **Restate the goal** in one sentence.
2. **List the files** it will create or modify before writing code.
3. **Write the test first** if it is a `lib/` function.
4. **Implement** the smallest change that makes the test pass.
5. **Run** the relevant tests / typecheck via terminal and report the result.
6. **Stop and ask** if the change would touch more than 5 files or add a new dependency.

---

## 10. What the agent must refuse

- Adding authentication libraries (out of demo scope — `tenant_id` comes from form).
- Adding new third-party services without an ADR in `docs/adr/`.
- Generating real email addresses, real org numbers, or any production-looking PII in tests or seed data — use obvious fakes (`acme.test`, `123456789`).
- Editing `.env*` files.
- Committing on the user's behalf.

---

## 11. Skills available in this repo

- `lead-qualification` (`.github/skills/lead-qualification/`) — domain rules for this app
- `grill-me` (installed under `.agents/skills/grill-me/`) — plan stress-test
- Any official vendor skill (e.g. Supabase) the user installs

When relevant, the agent should mention which skill informed the answer.

---

*Last updated: initial scaffold. Update via PR with reviewer approval.*
