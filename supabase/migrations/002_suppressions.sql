-- =============================================================================
-- 002_suppressions.sql — Suppression list and unsubscribe support
--
-- Apply via Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Idempotent where reasonable; rerunning is safe.
--
-- Adds:
--   • suppression_kind enum (email, domain, unsubscribed)
--   • tenant_suppressions table with UNIQUE constraint
--   • UNIQUE constraint on leads (tenant_id, lower(contact_email))
--
-- See docs/ADR-004-suppression-and-unsubscribe.md for rationale.
-- =============================================================================

-- Enum for suppression types --------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'suppression_kind') then
    create type suppression_kind as enum ('email', 'domain', 'unsubscribed');
  end if;
end$$;

-- Suppressions table -----------------------------------------------------
create table if not exists public.tenant_suppressions (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null,
  kind          suppression_kind not null,
  pattern       text not null check (length(trim(pattern)) > 0),
  created_at    timestamptz not null default now(),

  -- Prevent duplicates (makes addSuppression idempotent)
  constraint tenant_suppressions_unique unique (tenant_id, kind, pattern)
);

create index if not exists tenant_suppressions_tenant_id_idx
  on public.tenant_suppressions (tenant_id);

-- UNIQUE index on leads for duplicate detection ------------------------
-- Prevents duplicate email submissions per tenant (case-insensitive).
-- Server Action catches violation and returns friendly error.
-- Note: Use index instead of constraint because we need lower() function.
create unique index if not exists leads_tenant_email_lower_uniq
  on public.leads (tenant_id, lower(contact_email));

-- RLS on tenant_suppressions ---------------------------------------------
alter table public.tenant_suppressions enable row level security;

-- Deny-all baseline (same pattern as leads table)
drop policy if exists "deny all anon" on public.tenant_suppressions;
create policy "deny all anon"
  on public.tenant_suppressions
  for all
  to anon, authenticated
  using (false);

-- =============================================================================
-- End of migration 002
-- =============================================================================
