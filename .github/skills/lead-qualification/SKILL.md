---
name: lead-qualification
description: Use when implementing, modifying, or reviewing any code related to qualifying a sales lead in the Lead Gate app. Covers the exclusion rule, tenant isolation, input validation, and the standard test cases. Invoke explicitly with /lead-qualification or let the agent auto-load when the user mentions leads, qualification, exclusion, tenant_id, or the qualifyLead function.
version: 1.0.0
---

# Skill: lead-qualification

You are working on **Lead Gate**, a multi-tenant lead qualification demo.
This skill encodes the domain rules. Apply them whenever the user touches lead logic, the `leads` table, the `qualifyLead` function, the qualification Server Action, or related tests.

---

## When to use this skill

Auto-load when any of these appear in the user's request or the open file:

- `qualifyLead`, `qualify_lead`, "qualify a lead", "lead qualification"
- `leads` table, `lead_status`, `exclusion_reason`
- `tenant_id`, "tenant isolation", "RLS"
- `contact_email`, "missing email", "disposable email"
- Files under `lib/qualifyLead*`, `app/actions/qualifyLead*`, `tests/qualifyLead*`, `supabase/migrations/`

If the request is unrelated (e.g. styling, build config), do **not** use this skill.

---

## Domain model (authoritative)

### Lead row
```ts
type Lead = {
  id: string;                      // uuid, server-assigned
  tenant_id: string;               // uuid, REQUIRED on every row
  company_name: string;            // non-empty
  contact_email: string | null;    // optional input
  org_number: string | null;       // optional, free-form for the demo
  status: 'raw' | 'excluded' | 'outbound_ready';
  exclusion_reason:
    | 'missing_email'
    | 'disposable_email'
    | null;
  created_at: string;              // iso timestamp
};
```

### Qualification rule (single source of truth)

```
qualifyLead(input):
  email = trim(input.contact_email ?? '')

  IF email == ''
    return { status: 'excluded', exclusion_reason: 'missing_email' }

  domain = lowercase(part_after_last_'@'(email))
  IF domain in DISPOSABLE_DOMAINS
    return { status: 'excluded', exclusion_reason: 'disposable_email' }

  return { status: 'outbound_ready', exclusion_reason: null }
```

`DISPOSABLE_DOMAINS` lives in `lib/disposable-domains.ts` and at minimum includes:
`mailinator.com`, `tempmail.com`, `10minutemail.com`, `guerrillamail.com`, `yopmail.com`, `trashmail.com`.

The function is **pure**. No I/O, no Date.now(), no randomness. Same input → same output.

---

## Hard rules the agent must enforce

1. **One implementation only.** The rule lives in `lib/qualifyLead.ts`. The Server Action, the UI, and any future webhook **must call it** rather than re-checking email emptiness or domains inline.
2. **Every persisted row carries `tenant_id`.** Reject the operation if `tenant_id` is missing or not a UUID.
3. **Every read filters by `tenant_id`.** A query without a tenant filter is a bug. Flag it.
4. **No PII in logs or error responses.** Do not echo back the contact email; return only the status and reason code.
5. **Empty / whitespace email is not a validation error.** It is valid input that yields `excluded / missing_email`. Do not throw.
6. **Disposable domain matching is case-insensitive** and matches on the **final domain segment** of the email (post-`@`). Do not substring-match — `notmailinator.com` is **not** disposable.
7. **Status enum is closed.** Adding a new status or reason requires updating: the SQL enum migration, the TypeScript type, the rule, and the tests — in one PR.

---

## Required test cases

When `qualifyLead` is created or changed, `tests/qualifyLead.test.ts` must include at minimum:

| # | Input `contact_email` | Expected status | Expected reason |
|---|----------------------|-----------------|-----------------|
| 1 | `undefined` | `excluded` | `missing_email` |
| 2 | `null` | `excluded` | `missing_email` |
| 3 | `""` | `excluded` | `missing_email` |
| 4 | `"   "` | `excluded` | `missing_email` |
| 5 | `"user@mailinator.com"` | `excluded` | `disposable_email` |
| 6 | `"USER@MAILINATOR.COM"` (case) | `excluded` | `disposable_email` |
| 7 | `"user@notmailinator.com"` | `outbound_ready` | `null` |
| 8 | `"founder@acme.no"` | `outbound_ready` | `null` |

Add a property-style test asserting purity: calling `qualifyLead` twice with the same input returns deeply equal results.

---

## Implementation checklist

When asked to "implement" or "scaffold the qualification feature":

1. Create `lib/disposable-domains.ts` exporting `DISPOSABLE_DOMAINS: ReadonlySet<string>`.
2. Create `lib/qualifyLead.ts` exporting the pure function and its result type.
3. Create `tests/qualifyLead.test.ts` covering all rows in the table above.
4. Run `npm test` and report pass/fail before moving on.
5. Only then create `app/actions/qualifyLead.ts` (Zod validation → call pure fn → insert into Supabase with `tenant_id`).
6. Only then create the UI form in `app/page.tsx`.
7. Update `supabase/migrations/001_leads.sql` if the schema changes.

Stop after each step and surface the result. Do not run all 7 in one shot.

---

## Review checklist (use when reviewing a diff)

- [ ] No duplicated rule logic outside `lib/qualifyLead.ts`
- [ ] Every DB query and mutation includes `tenant_id`
- [ ] Zod schema rejects unknown fields and validates `tenant_id` as UUID
- [ ] No `contact_email` value appears in any log line, thrown error, or response shown to other tenants
- [ ] No `any`, no non-null assertion (`!`) on user input
- [ ] Tests cover all 8 cases above and pass
- [ ] No new dependency added without ADR
- [ ] No secret in code, env example, or markdown
- [ ] RLS is `enable`d on `leads` in the migration

If any item fails, output: **Must fix / Should fix / Nice to have** and stop.

---

## What to refuse

- Adding a status or exclusion reason not listed in the enum without updating migration + type + rule + tests together.
- Implementing the rule inline in the UI or the Server Action ("just this once").
- Reading or writing `leads` without a `tenant_id` filter.
- Hardcoding a tenant id other than the obvious test fixture (`00000000-0000-0000-0000-000000000001`).

---

*This skill is the contract for the Lead Gate domain. If a request conflicts with these rules, surface the conflict and ask before proceeding.*
