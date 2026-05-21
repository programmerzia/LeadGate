# ADR-001 — Stack: Next.js 15 + Supabase + Vitest + Tailwind v4

- **Status:** Accepted
- **Date:** Demo build
- **Decision drivers:** Build a tiny vertical slice that demonstrates a complete AI-assisted workflow (plan → grill → build → test → review) within ~4 hours, while previewing the architecture used by the larger outreach platform backlog.

## Context

The demo must show:
1. **Multi-tenant** persistence with row-level enforcement (the security story).
2. **A pure, testable rule** at the heart of the feature (the quality story).
3. **A real UI** the audience can interact with live.
4. A toolchain the team can extend to the production backlog without a stack rewrite.

Time budget is small. Adding stacks the audience cannot evaluate live (e.g. a separate API service) costs the demo more than it gains.

## Decision

| Concern | Choice |
|---|---|
| Framework | **Next.js 15 (App Router)** with **Server Actions** |
| Language | **TypeScript** with `strict` + `noUncheckedIndexedAccess` |
| Database | **Supabase Postgres** with **RLS** |
| Validation | **Zod** at the Server Action boundary |
| UI | **Tailwind v4** + native HTML form elements |
| Tests | **Vitest** (node env) for the pure rule |
| Lint / format | **ESLint 9** flat config + **Prettier** |

## Alternatives considered

- **Express + React SPA + Postgres**. Rejected: two services to run, more boilerplate, no built-in form/server-action ergonomics.
- **Remix**. Reasonable equivalent. Rejected because the larger backlog already aligns with Vercel deployment and Supabase examples are denser for Next.
- **Plain Postgres (no Supabase)**. Rejected: we lose the RLS-as-feature talking point and need to write our own auth/migrations infra to demo it.
- **Drizzle / Prisma**. Rejected for the demo only — the hand-written single-table SQL is tighter to talk through and avoids ORM-specific debate.

## Consequences

**Positive**
- One codebase, one process, one URL — fits the 8-minute demo window.
- Server Actions remove the need for a hand-rolled API contract.
- Supabase's Studio UI lets us *show* RLS being enforced without code.
- Stack is the same as the future outreach backlog → migration cost ≈ 0.

**Negative / risks**
- Tailwind v4 is in beta (pinned).
- Service-role key has wide privileges; mitigated by `lib/supabase/server.ts` being the only consumer and `server-only` enforcing import direction.
- Supabase free tier sleeps after inactivity → first request after a pause is slow during a live demo. Mitigation: warm with a request 60s before presenting.

## Validation

- `npm run verify` passes (typecheck + lint + tests + secret-scan).
- The app boots and persists leads with no `.env.local` (memory fallback) and with a real Supabase project (zero code change).
