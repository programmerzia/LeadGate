# ADR-003 — Storage fallback: in-memory store when Supabase is not configured

- **Status:** Accepted

## Context

The repo must be runnable for a reviewer who clones it without secrets, AND the same `npm run dev` must transparently switch to a real Supabase project when `.env.local` is filled in. Two failure modes we want to avoid:

- A reviewer clones, runs `npm run dev`, sees a runtime error about missing env vars, gives up.
- The team adds Supabase later and has to refactor the data layer.

## Decision

`lib/store/index.ts` exports `getStore()` returning a `LeadStore`:

- If `NEXT_PUBLIC_SUPABASE_URL` **and** `SUPABASE_SERVICE_ROLE_KEY` are set, it returns a `SupabaseStore`.
- Otherwise it returns a process-singleton `MemoryStore` keyed by `tenant_id` with the same `LeadStore` contract.

The UI shows a **backend badge** ("Supabase" / "In-memory (dev)") so the demo audience can see which mode is active.

## Consequences

**Positive**
- Cold-clone DX: works out of the box.
- Switch to Supabase = fill in `.env.local`. No code changes.
- Tests stay fast — no DB needed.

**Negative**
- The memory store loses data on dev-server restart. This is by design and is documented in the badge tooltip and in the README.
- The memory store is single-process; running `next start` behind multiple workers would not share data. Mitigation: not used in production paths.

## Validation

- `getStore()` returns the correct backend based on env presence.
- `BackendBadge` reflects the active backend in the UI.
- Both stores implement the same `LeadStore` interface (TS enforces this).
