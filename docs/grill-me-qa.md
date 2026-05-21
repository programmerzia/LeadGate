# grill-me Q&A — Lead Gate plan

> Transcript of a `/grill-me` session run before any code was written.
> Two answers materially changed the design — flagged with ⚡.

---

**Original plan (one paragraph)**

> "Build a single page where I submit a sales lead (company, email, org number) and it stores the row in Supabase with a status. If the email is missing, status is `excluded` with reason `missing_email`. Use Next.js 15, TypeScript, Supabase, Vitest. Multi-tenant via a `tenant_id` UUID on every row."

---

## Q1 — "What does *missing email* mean? null, empty string, whitespace, or 'me@'?"

Need to be explicit. The rule treats all of:

- `undefined`, `null`
- empty string `""`
- any string that is whitespace-only after `trim()` (`"   "`, `"\t\n"`)

…as the same case → `excluded / missing_email`.

A syntactically malformed but non-empty value (e.g. `"me@"`, `"foo"`) is a **validation error** at the Server Action boundary, not the qualification rule's job. We surface a field error rather than silently storing junk.

## Q2 — ⚡ "What about disposable email providers? Mailinator, etc."

This was originally out of scope, but grill-me argued: if the demo's whole point is "qualify a lead", treating `mailinator.com` as outbound-ready makes the demo *look broken*. **Added second exclusion rule: `disposable_email`.** Required:

- new enum value
- new test cases (case-insensitive, no substring matching — `notmailinator.com` must pass)
- bumped the rule from 2 branches to 3

Cost: ~30 min of extra test surface. Win: the demo has a *second* visibly different result panel, which makes the rule narrative tangible.

## Q3 — ⚡ "Tenant isolation without auth — how do you stop me typing tenant_id `00000000-0000-0000-0000-000000000099` in DevTools?"

The original plan let the form post any UUID. grill-me pushed: that's not a multi-tenant story, that's a "field on every row" story.

Decided to:

1. Maintain a closed allowlist of demo tenants in `lib/tenants.ts`.
2. Server Action validates `tenant_id` ∈ allowlist *and* shape (UUID via Zod).
3. Document this clearly in **ADR-002** as the demo posture; the migration path to real auth is a one-function swap (`getTenantsForUser(session)`).

This produced the second talking point of the demo: "this is the *seam* where real auth plugs in — nothing else changes."

## Q4 — "Where does the rule live? What happens if Sales asks for a 4th exclusion reason next month?"

Confirmed: **single source of truth in `lib/qualifyLead.ts`**. Server Action calls it, UI doesn't reimplement, future webhook calls it. Adding a new reason requires updating *together*: SQL enum migration, TS type, rule, and tests — codified as a hard rule in `.github/skills/lead-qualification/SKILL.md` under "Status enum is closed".

## Q5 — "What happens to a row right after `qualifyLead` decides 'excluded'? Is it kept or dropped?"

**Kept.** The status is `excluded`, not deleted. Real-life value: the data team can later run enrichment to *find* the missing email, then re-qualify. This shaped the wording of the success message: *"Excluded from outbound — no contact email. Kept for enrichment."*

## Q6 — "Why service-role on the server? Isn't that footgun-shaped?"

It is. Mitigation:

- `lib/supabase/server.ts` is the only file that reads it. It imports `server-only`. A client-bundle import will fail the build.
- Restrictive deny-all RLS policy means anon-key access is impossible. Service role bypassing RLS is a deliberate trust boundary — the *application* is responsible for the tenant filter, and code review enforces it.
- The pre-commit hook + Gitleaks CI step + `.gitignore` make leaking the key into history non-trivial.

## Q7 — "PII in logs?"

Stripped. `console.error` in `submitLeadAction` does not include the request body. The UI list masks the email's local part. `error.message` returned to the client never contains user input.

## Q8 — "What about Supabase free-tier cold start during the live demo?"

Real risk. Plan: warm a request 60 seconds before walking on. If Supabase is asleep, the in-memory fallback (ADR-003) means the demo still runs — and the **backend badge** in the UI tells the audience why. The story holds.

## Q9 — "Tests — what is the minimum that prevents regressions?"

Decided on:

- 4 cases of missing-email permutations
- 3 cases of disposable-email (incl. case-insensitive + the "notmailinator.com" guard)
- 3 happy-path cases incl. subdomain
- 1 purity test asserting deep equality on repeated calls
- 1 immutability test (input is not mutated)

That's ~13 cases for one function — enough to credibly stop regressions, cheap enough to write before the UI.

---

## Net design changes from this session

| # | Change | Source |
|---|---|---|
| 1 | Added `disposable_email` exclusion reason | ⚡ Q2 |
| 2 | Closed allowlist of tenants + ADR-002 | ⚡ Q3 |
| 3 | Made "kept for enrichment" explicit in the success copy | Q5 |
| 4 | Added in-memory fallback + backend badge (ADR-003) | Q8 |
| 5 | Codified status-enum-closure rule into the SKILL.md | Q4 |

---

## How this maps onto the demo

- Slide 2: "AI didn't write the code — it stress-tested the design."
- Open this file. Point at ⚡ Q2 and ⚡ Q3.
- Note: every change above is also visible in `lib/`, `tests/`, the SKILL.md, and the ADRs.
