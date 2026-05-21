# SECURITY.md — threat model & posture

> A short, audit-friendly summary of how Lead Gate handles secrets, multi-tenancy, and PII. Every claim here is enforced somewhere in the codebase or CI.

## Trust boundaries

```
Browser  ─►  Server Action  ─►  Lead Store  ─►  Postgres (RLS)
                ▲                    ▲
                │ Zod, allowlist     │ tenant_id filter
                │ (validation)       │ on every query
                └────────────────────┘
```

- **Browser is untrusted.** All inputs revalidated server-side.
- **Server Action is the trust boundary.** Owns validation + tenant allowlist.
- **Database** has RLS enabled with a restrictive deny-all policy on anon + authenticated roles. Service role bypasses RLS by design.

## Secrets

| Secret | Where it lives | Where it's used | Rotation |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` (Supabase **Secret key**, `sb_secret_…` or legacy JWT) | OS env / Vercel project env / `.env.local` (gitignored) | `lib/supabase/server.ts` only | Rotate via Supabase dashboard |
| `NEXT_PUBLIC_SUPABASE_URL` | same | client+server | Not secret; tied to project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase **Publishable key**, `sb_publishable_…` or legacy JWT) | same | not used by the demo path; safe to expose | Tied to project |
| GitHub PAT (MCP) | VS Code input prompt | only on developer's machine | Rotate via GitHub settings |

Rules:

1. `.env*` is in `.gitignore` and `.prettierignore`. CI does not echo env in logs.
2. The pre-commit hook (`scripts/check-secrets.mjs`) refuses commits containing JWT-shaped strings, AWS keys, GitHub tokens, OpenAI / Anthropic / Stripe keys, and PEM private key blocks.
3. Gitleaks runs in CI on every PR with the same patterns plus default ruleset.
4. `server-only` import in `lib/supabase/server.ts` makes a client-bundle import a build error.

## Multi-tenancy

| Layer | Control |
|---|---|
| Form | `tenant_id` is a hidden field reflecting the active tenant in the UI |
| Server Action | Zod validates UUID; `isKnownTenant()` allowlist check |
| Pure rule | Doesn't know about persistence — operates on input only |
| Store | Every read uses `.eq("tenant_id", tenantId)` |
| Database | RLS enabled; deny-all baseline; service role bypass is intentional |

Migration to real auth: replace `isKnownTenant(formTenantId)` with `userOwnsTenant(session.user.id, formTenantId)` and swap the deny-all policy for a membership-based RLS rule. **No store, action, or UI changes required.**

## PII

- Full email is **never** returned in error responses (`submitLeadAction` returns generic copy on failure).
- The recent-leads UI **masks** the email's local part (`f***@acme.no`) so screenshots are safe.
- Server logs do not include user input. `console.error` for insert failures shows the error type, not the request body.

## Dependencies

- Dependabot is enabled (`.github/dependabot.yml`) for npm + GitHub Actions.
- ESLint forbids `any` and non-null assertions on user input.
- Snyk extension recommended in `.vscode/extensions.json` for in-IDE CVE scanning. For CI, add `snyk/actions/node@master` if you have a token.

## What we explicitly do **not** defend against in this demo

- DDoS / rate limiting (no auth, no rate limiter — out of scope).
- CSRF on Server Actions (Next.js handles same-origin checks; no cross-domain forms exist).
- Database backup / disaster recovery (Supabase platform feature, not application code).
- End-user authentication (out of scope; ADR-002 documents the migration path).

## Reporting

Found something? Open a private security advisory on the GitHub repo or email the maintainer. Do **not** open a public issue with reproduction details.
