

# Plan — Suppression list + Unsubscribe flow

> Status: **Approved after grill-me review** · Author: AI-assisted draft · Scope: features #1 and #2 from the PDF-relevant feature list.
> Ready for implementation.

---

## 1. Design decisions (locked after grill-me session)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Suppression pattern types | `email` or `domain` literals only — **no wildcards / regex** | Wildcards are a footgun (`*.com` would block everything). Keep semantics provable. |
| 2 | Pattern normalisation | Lowercase **entire email** + trim at write time; exact match at read time | Pragmatic (Gmail/Outlook treat local-part case-insensitively). Document in ADR-004. |
| 3 | Duplicate detection | **UNIQUE constraint** on `(tenant_id, lower(contact_email))` — catch violation, return field error | DB-level guarantee, race-proof. NOT an exclusion reason — it's a validation error. |
| 4 | Unsubscribe storage | **Reuse** the `tenant_suppressions` table with `kind = 'unsubscribed'` | Single mechanism, single place to query, no parallel data path. |
| 5 | Unsubscribe link safety | HMAC-SHA256 signed token, **stateless + permanent**, **two-step** (page → button → action) | Tokens don't expire (Gmail pattern). Idempotent. Two-step defeats scanner-prefetch. |
| 6 | Exclusion check location | **Server Action pre-filter** before calling `qualifyLead()` — NO wrapper function | Keeps `qualifyLead()` pure and unchanged. All 13 tests stay green with zero edits. |
| 7 | Suppression check method | `checkSuppression(tenantId, email): Promise<'suppressed' \| 'unsubscribed' \| null>` | Single indexed query. More efficient than loading all suppressions into Sets. |
| 8 | Leads table mutability | **Immutable** — suppressions apply to new submissions only, no retroactive updates | Preserves audit trail. UI shows current status via runtime check, not by rewriting history. |
| 9 | Suppression UI placement | A **third section below** the main 2-column grid (form / list) | Keeps the hero layout intact; adds without redesign. |
| 10 | Unsubscribe demo affordance | A "Copy unsubscribe link" button in the lead detail modal | Lets you click the link live on stage. |
| 11 | Exclusion reasons | **Two separate:** `suppressed` (manual blocks) and `unsubscribed` (opt-out) | Legal/compliance distinction (CAN-SPAM, GDPR). Auditable separately. |
| 12 | Suppression list pagination | **None** — show all suppressions; add TODO comment for future if count exceeds ~500 | Simple for demo. Browser handles rendering a few hundred items fine. |
| 13 | UNSUBSCRIBE_SECRET fallback | Generate **random secret on boot** if env not set; log warning with value | Session-specific tokens in dev (restart invalidates). Required env var for production. |
| 14 | Migration strategy | **Two migrations:** 002 creates `suppression_kind` enum + table; 003 extends `exclusion_reason` | Each migration self-contained. No cross-migration enum dependencies. |
| 15 | Domain extraction | New **`lib/domain-utils.ts`** with `extractDomain()` and `normalizeDomainPattern()` | DRY. Refactor `isDisposableEmail` to use shared helper. |
| 16 | Duplicate error UX | Catch Postgres error **23505**, return friendly field error | Best UX. Document in SECURITY.md: "Reveals email presence — acceptable for internal tool." |
| 17 | UI update on add/remove | Actions return new suppression / success; client updates suppressions state only | Fast. No full refresh. Note: "Suppressions apply to new submissions only." |
| 18 | Public route security | **No rate limiting** (demo scope) | Document HMAC strength + production recommendation in SECURITY.md. Idempotent ops prevent abuse. |

Decisions locked. No further changes without re-grill.

---

## 2. Data model

### New table: `tenant_suppressions`
```sql
id            uuid PK
tenant_id     uuid NOT NULL          -- tenant filter on every read
kind          suppression_kind NOT NULL  -- see enum below
pattern       text NOT NULL           -- lowercase, trimmed (entire email for 'email', domain for others)
created_at    timestamptz default now()

UNIQUE (tenant_id, kind, pattern)     -- prevents duplicates (idempotent adds)
INDEX  (tenant_id)                    -- read filter
```

### New enum: `suppression_kind`
```sql
CREATE TYPE suppression_kind AS ENUM ('email', 'domain', 'unsubscribed');
```
Created in migration 002. **Separate** from `exclusion_reason` to avoid cross-migration dependencies.

### Extend `exclusion_reason` enum
Add **two** values: `suppressed`, `unsubscribed`.
(NOT adding `duplicate` — that's a validation error, not an exclusion reason.)

### New UNIQUE constraint on `leads`
```sql
ALTER TABLE leads ADD CONSTRAINT leads_tenant_email_unique
  UNIQUE (tenant_id, lower(contact_email));
```
Prevents duplicate email submissions per tenant. Caught in Server Action with friendly error.

> **Migration split:** Postgres can't `ALTER TYPE ... ADD VALUE` inside a transaction with DDL. So two new migrations:
> - `002_suppressions.sql` — `suppression_kind` enum + table + indexes + RLS + UNIQUE constraint on leads
> - `003_extend_exclusion_reasons.sql` — enum extension only (standalone, non-transactional)

### Domain types (extending `lib/types.ts`)
```ts
ExclusionReason now includes: 'suppressed' | 'unsubscribed'  // NOT duplicate
SuppressionKind = 'email' | 'domain' | 'unsubscribed'
Suppression = { id, tenant_id, kind, pattern, created_at }
```

---

## 3. The rule — unchanged, suppression checks in Server Action

**Critical design win:** `lib/qualifyLead.ts` does NOT change. Zero edits. All 13 existing tests stay green.

The original pure function:
```ts
qualifyLead(input: LeadInput): QualificationResult
```

Stays exactly as-is. New suppression/unsubscribe logic lives in the **Server Action layer** as a pre-filter:

```ts
// app/actions/leads.ts — submitLeadAction (pseudo-code)

const email = input.contact_email?.trim().toLowerCase();

if (email) {
  const suppressionStatus = await store.checkSuppression(input.tenant_id, email);

  if (suppressionStatus === 'unsubscribed') {
    return { status: 'excluded', exclusion_reason: 'unsubscribed', message: '...' };
  }

  if (suppressionStatus === 'suppressed') {
    return { status: 'excluded', exclusion_reason: 'suppressed', message: '...' };
  }
}

// Then call the original pure rule
const result = qualifyLead(input);  // unchanged function
```

**Check order:**
1. Missing email (handled by `qualifyLead`)
2. **Unsubscribed** (Server Action pre-filter) ← new
3. **Suppressed** (Server Action pre-filter) ← new
4. Disposable domain (handled by `qualifyLead`)
5. Duplicate (DB UNIQUE constraint violation, caught in error handler) ← new
6. Outbound ready

**Why this approach wins:**
- `qualifyLead` remains a pure, context-free function with zero I/O
- No wrapper function needed
- No `policy` object needed
- All 13 tests unchanged
- Suppression logic testable via Server Action integration tests or `checkSuppression` unit tests

---

## 4. Unsubscribe token — small, sturdy module

`lib/unsubscribe-token.ts`:
```ts
sign(payload: { tenant_id, email }): string    // "{base64url(json)}.{base64url(hmac)}"
verify(token: string): { tenant_id, email } | null
```

- HMAC-SHA256
- Secret from `UNSUBSCRIBE_SECRET` env var
- **Dev fallback:** Generate random 32-byte secret on boot if env not set; log warning once with generated value
  - Tokens work but are session-specific (restart invalidates them — acceptable for dev)
  - Production **must** set env var for persistent tokens
- Constant-time signature comparison (`crypto.timingSafeEqual`)
- Tokens are **stateless and permanent** — no expiration, no DB roundtrip to verify
- Idempotent: re-clicking the same link just re-inserts (UNIQUE constraint makes it a no-op)

---

## 5. Storage layer additions (LeadStore interface)

**Three new methods**, all tenant-scoped:

```ts
listSuppressions(tenantId: string): Promise<Suppression[]>
  // Returns all suppressions for a tenant (no limit — show all in UI per Decision 12)

addSuppression(tenantId: string, kind: SuppressionKind, pattern: string): Promise<Suppression>
  // Normalizes pattern (lowercase + trim), inserts. Returns existing on UNIQUE violation (idempotent).

removeSuppression(tenantId: string, id: string): Promise<boolean>
  // Deletes by id, scoped to tenantId. Returns true if deleted, false if not found.

checkSuppression(tenantId: string, email: string): Promise<'suppressed' | 'unsubscribed' | null>
  // Single query. Checks if email (or its domain) matches any suppression.
  // Returns 'unsubscribed' if kind='unsubscribed', 'suppressed' for kind='email'|'domain'.
  // SQL logic:
  //   WHERE tenant_id = $1 AND (
  //     (kind = 'email' AND pattern = lower($2))
  //     OR (kind IN ('domain', 'unsubscribed') AND pattern = extractDomain(lower($2)))
  //   )
```

Both `memory` and `supabase` implementations get them. Same contract, same tests apply to both.

**Removed from original plan:**
- ❌ `buildPolicy()` — not needed (using single query check instead)
- ❌ `markUnsubscribed()` — leads table is immutable

---

## 6. Server Actions

| New file | Actions |
|---|---|
| `app/actions/suppressions.ts` | `addSuppressionAction(tenantId, kind, pattern)` — validates, normalizes, adds. Returns new suppression. · `removeSuppressionAction(tenantId, id)` — removes. Returns success. |
| `app/actions/unsubscribe.ts` | `confirmUnsubscribeAction(token)` — verifies token, adds suppression with `kind='unsubscribed'`. Idempotent. |

| Changed file | Change |
|---|---|
| `app/actions/leads.ts` | `submitLeadAction` pre-filter: calls `store.checkSuppression(tenantId, email)` BEFORE `qualifyLead(input)`. Catches UNIQUE violation (23505) for duplicates. |
| `app/actions/leads.ts` | `listLeadsAction` also returns `suppressions: Suppression[]` (one roundtrip for the whole dashboard) |

All actions stay short. Same Zod-validated, allowlisted-tenant pattern as today.

---

## 7. UI changes

| File | Change |
|---|---|
| `app/components/SuppressionsPanel.tsx` (new) | Small panel: add input + kind selector (email/domain) + list of current entries with × delete buttons. ~120 lines. |
| `app/components/Dashboard.tsx` | Pass `suppressions` down to a new `<SuppressionsPanel>` rendered below the form/list grid. |
| `app/components/LeadDetailsModal.tsx` | Add a "Unsubscribe link" row with a Copy button. Only shown when lead has a contact_email. |
| `app/components/StatusBadge.tsx` | Add labels for new reasons (`suppressed`, `unsubscribed`, `duplicate`). |
| `app/unsubscribe/[token]/page.tsx` (new) | Public route. Server Component verifies token. If valid → render form with one button. If invalid → friendly error. Submitting calls `confirmUnsubscribeAction`. |

Routes added: just **one** (`/unsubscribe/[token]`). No nav changes.

---

## 8. Tests

Existing 13 tests in `tests/qualifyLead.test.ts` **stay completely unchanged** — all green, zero edits.

Adding **~5 new test files/cases**:

| Test file/case | Purpose |
|---|---|
| `tests/domain-utils.test.ts` | Unit tests for `extractDomain()` and `normalizeDomainPattern()` edge cases |
| `tests/unsubscribe-token.test.ts` | `sign + verify roundtrip` · `tampered payload rejected` · `wrong secret rejected` · `random dev secret generation` |
| Integration test (manual) | Submit lead → block domain → re-submit → verify excluded/suppressed |
| Integration test (manual) | Duplicate email submission → verify friendly field error (not generic error) |
| Integration test (manual) | Unsubscribe flow → verify kind='unsubscribed' in DB → re-submit → verify excluded/unsubscribed |

Still all-pure unit tests for lib/, no DB / network mocks. `npm test` target: under 250 ms.

---

## 9. Documentation deltas

- **New: `docs/ADR-004-suppression-and-unsubscribe.md`** — explains the unified suppression table (suppressions + unsubscribes), HMAC-token design, two-step flow rationale (Gmail / scanner-prefetch defence)
- **Update: `.github/skills/lead-qualification/SKILL.md`** — adds policy contract, new exclusion reasons, new test cases, updated review checklist
- **Update: `README.md`** — features section
- **Update: `docs/SECURITY.md`** — token + `UNSUBSCRIBE_SECRET` row in secrets table
- **Update: `docs/DEMO-SCRIPT.md`** — add a 30-second "suppression isolation + live unsubscribe" beat

---

## 10. File map

### New (10)
```
lib/domain-utils.ts                                extractDomain + normalizeDomainPattern
lib/unsubscribe-token.ts                           sign / verify
app/actions/suppressions.ts                        add / remove
app/actions/unsubscribe.ts                         confirm
app/components/SuppressionsPanel.tsx               UI
app/unsubscribe/[token]/page.tsx                   public route
supabase/migrations/002_suppressions.sql           suppression_kind enum + table + UNIQUE constraint
supabase/migrations/003_extend_exclusion_reasons.sql   enum extension
tests/unsubscribe-token.test.ts                    HMAC tests
docs/ADR-004-suppression-and-unsubscribe.md        rationale
```

### Changed (11)
```
lib/types.ts                                       new types (SuppressionKind, Suppression) + exclusion reasons
lib/disposable-domains.ts                          refactor isDisposableEmail to use extractDomain
lib/store/types.ts                                 3 new methods (checkSuppression, listSuppressions, addSuppression, removeSuppression)
lib/store/memory.ts                                implementations
lib/store/supabase.ts                              implementations
app/actions/leads.ts                               checkSuppression pre-filter; catch UNIQUE violation; return suppressions
app/components/Dashboard.tsx                       pass + render SuppressionsPanel; manage suppressions state
app/components/LeadDetailsModal.tsx                copy-unsubscribe-link button
app/components/StatusBadge.tsx                     new labels (suppressed, unsubscribed)
tests/qualifyLead.test.ts                          UNCHANGED (all 13 tests stay green)
.github/skills/lead-qualification/SKILL.md         document Server Action pre-filter pattern
.env.local.example                                 + UNSUBSCRIBE_SECRET
README.md                                          features mention
docs/SECURITY.md                                   secrets table row + duplicate disclosure note + rate-limit recommendation
docs/DEMO-SCRIPT.md                                new demo beat
```

(21 files touched, none of them large.)

---

## 11. What I'm explicitly NOT building (anti-scope-creep)

- ❌ Wildcards / regex patterns
- ❌ Global (cross-tenant) suppression list
- ❌ Suppression categories, tags, notes, expiry
- ❌ Suppression import/export (CSV)
- ❌ Bulk operations
- ❌ Unsubscribe-undo / re-subscribe
- ❌ Realtime updates between tabs
- ❌ Audit log
- ❌ A separate "suppressions" page/route
- ❌ Pagination on the suppression list (show all; TODO for 500+ rows)
- ❌ Rate limiting on unsubscribe route (document in SECURITY.md)
- ❌ `qualifyLeadWithPolicy` wrapper function (Server Action pre-filter instead)
- ❌ Retroactive lead updates on unsubscribe (immutable leads table)

---

## 12. Order of execution (when you say go)

Sequential — each step leaves the app green before moving on:

1. **Domain utils + tests** — `lib/domain-utils.ts` with `extractDomain()` + `normalizeDomainPattern()`, refactor `isDisposableEmail`, tests green
2. **Types** — `lib/types.ts` extend enums and add new types (no behavior change yet)
3. **Store contract + implementations** — `LeadStore` grows 3 methods; memory + supabase implement; existing app still works (new methods not called yet)
4. **Migrations** — `002` + `003` written (you apply when ready)
5. **Server Action pre-filter** — `submitLeadAction` calls `checkSuppression`, catches UNIQUE violation; `listLeadsAction` returns suppressions
6. **Unsubscribe token + tests** — pure module with random dev secret generation, easy to verify
7. **Suppression actions** — `app/actions/suppressions.ts` (add/remove)
8. **Unsubscribe action** — `app/actions/unsubscribe.ts` (confirm)
9. **Suppression panel UI** — render in Dashboard, wire to actions, manage state
10. **Status badge updates** — add labels for new exclusion reasons
11. **Unsubscribe page + copy-link button** — public route + modal button
12. **Docs** — ADR-004, SKILL.md update, SECURITY.md additions, demo-script beat
13. **`npm run typecheck && npm test`** — all green

If any step fails, I stop and surface it before moving on.

---

## 13. Estimated effort

| Phase | Time |
|---|---|
| Types + policy + rule + tests | ~30 min |
| Store contract + both implementations | ~30 min |
| Migrations + server actions | ~25 min |
| Suppression panel UI | ~30 min |
| Unsubscribe token (+ tests) | ~20 min |
| Unsubscribe page + action + copy button | ~25 min |
| Docs (ADR-004, SKILL.md, SECURITY.md, demo-script) | ~20 min |
| **Total** | **~3 h** |

---

## 14. Acceptance criteria (how we'll know we're done)

- [ ] `npm test` passes with ≥ 18 tests (13 existing qualifyLead + ~5 new across domain-utils and unsubscribe-token)
- [ ] `npm run typecheck` + `npm run lint` clean
- [ ] Existing 13 tests in `tests/qualifyLead.test.ts` **completely unchanged** and all passing
- [ ] Submitting `evil@spammer.test` when `spammer.test` is in Tenant A's domain blocklist → excluded / suppressed
- [ ] Submitting the same `founder@acme.no` twice for the same tenant → second submission returns field error: "This email has already been submitted"
- [ ] Adding/removing entries in the suppression panel updates only the suppressions list (no full page refresh)
- [ ] UI shows note: "Suppressions apply to new submissions only"
- [ ] Visiting an unsubscribe link → confirmation page → button click → success page; suppression added with `kind='unsubscribed'`
- [ ] Submitting the unsubscribed email after that → excluded / unsubscribed
- [ ] Tampered unsubscribe token → friendly error page, no DB write
- [ ] Missing `UNSUBSCRIBE_SECRET` env var → random secret generated on boot, warning logged once
- [ ] No new dependency added (still just `next`, `react`, `@supabase/supabase-js`, `zod`, `server-only`)
- [ ] ADR-004 written with all key decisions documented
- [ ] SECURITY.md updated with duplicate disclosure note + rate-limiting recommendation

---

## Approval status

✅ **Approved** after grill-me session. Proceeding with implementation.
