# ADR-002 — Tenant isolation: service-role server client + closed allowlist + RLS deny baseline

- **Status:** Accepted
- **Supersedes:** —
- **Related:** `lib/store/supabase.ts`, `supabase/migrations/001_leads.sql`, `.github/skills/lead-qualification/SKILL.md`

## Context

The Lead Gate demo is multi-tenant from line one. The demo has **no end-user authentication** — tenant identity comes from a UI tenant switcher that posts a `tenant_id` field. We still want a security story that scales to the full outreach platform without rework.

There are three plausible postures:

1. **Anon key + RLS-only.** Browser holds the anon key; RLS policies allow only rows that match a JWT claim. *Requires real auth, not in scope.*
2. **Anon key + custom RPC checks.** All access via stored procedures that re-derive tenant. *Possible but heavyweight for one form.*
3. **Service-role key, server-only, with explicit `tenant_id` filters in code.** Application is the trust boundary. RLS is a deny-baseline second line of defence.

## Decision

We choose **option 3** with these rules, all enforced by code review and the `lead-qualification` skill:

1. The service-role key is read **only** by `lib/supabase/server.ts`, which imports `server-only`. Any client-bundle import fails the build.
2. Server Actions accept `tenant_id` from form data, validate it as a UUID with Zod, and check it against a closed allowlist (`isKnownTenant`). Real auth would replace the allowlist with a session lookup; the rest stays.
3. **Every** `from("leads")` query has `.eq("tenant_id", tenantId)`. Code review and `.coderabbit.yaml` rules flag any query missing it.
4. RLS is `enable`d on `leads` with a **restrictive deny-all** policy on `anon` and `authenticated`. Service role bypasses RLS by design — this is intentional. If a future code path ever uses the anon key, no rows leak by default.
5. PII (full email) is never returned in error responses to other tenants and is masked in the UI list (`f***@acme.no`).

## Alternatives considered

- **RLS-only with synthetic JWT claims.** Adds JWT signing infra to a 4-hour demo. Defer to the real product where users authenticate.
- **Per-tenant Postgres roles via `set_config('request.jwt.claims', ...)`.** Powerful, but requires a custom `withTenant()` wrapper around every call. Worth doing in the larger product; over-engineered here.

## Consequences

**Positive**
- Zero auth-system surface for the demo.
- Tenant isolation is *visible* (every query has `.eq("tenant_id", ...)`) — easy to defend in review.
- Migration path: replace `isKnownTenant` with `getTenantsForUser(session)` and switch the deny-all policy for a real RLS rule. No store / action / UI changes.

**Negative / risks**
- A bug that omits the tenant filter would leak rows across tenants because service role bypasses RLS. Mitigations:
  - `lead-qualification` skill rejects PRs missing the filter.
  - `.coderabbit.yaml` path instructions ask CodeRabbit to flag it.
  - Tests (future) can hit the in-memory store with two tenants to assert isolation.

## Validation

- `supabase/migrations/001_leads.sql` enables RLS and installs the deny-all policy.
- `lib/store/supabase.ts` includes `.eq("tenant_id", tenantId)` on every read.
- The skill's review checklist requires `tenant_id` on every persisted row.
