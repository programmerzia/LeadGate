-- =============================================================================
-- 001_leads.sql — Lead Gate initial schema
--
-- Apply via Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Idempotent where reasonable; rerunning is safe.
--
-- Security model (see docs/ADR-002-tenant-isolation.md):
--   • leads.tenant_id is REQUIRED on every row.
--   • RLS is enabled.
--   • The application talks to Supabase using the SERVICE_ROLE key
--     from a Server Action only — service role bypasses RLS by design.
--   • The Server Action validates tenant_id (UUID) before every query
--     and includes it in every WHERE clause. RLS is the second line of
--     defence: if any future code path uses the anon key, no rows leak.
-- =============================================================================

-- enums --------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type lead_status as enum ('raw', 'excluded', 'outbound_ready');
  end if;

  if not exists (select 1 from pg_type where typname = 'exclusion_reason') then
    create type exclusion_reason as enum ('missing_email', 'disposable_email');
  end if;
end$$;

-- table --------------------------------------------------------------
create table if not exists public.leads (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null,
  company_name      text not null check (length(trim(company_name)) > 0),
  contact_email     text,
  org_number        text,
  status            lead_status not null default 'raw',
  exclusion_reason  exclusion_reason,
  created_at        timestamptz not null default now(),

  -- Either status is 'excluded' AND a reason is set, or no reason.
  constraint leads_reason_consistency check (
    (status = 'excluded' and exclusion_reason is not null)
    or (status <> 'excluded' and exclusion_reason is null)
  )
);

create index if not exists leads_tenant_id_idx
  on public.leads (tenant_id);

create index if not exists leads_tenant_status_idx
  on public.leads (tenant_id, status);

create index if not exists leads_tenant_created_idx
  on public.leads (tenant_id, created_at desc);

-- RLS ----------------------------------------------------------------
alter table public.leads enable row level security;

-- Deny-all baseline: anon + authenticated have no implicit access.
-- Service role bypasses RLS. The app's Server Actions (which use the
-- service role) are the ONLY path to leads in this demo.
--
-- If you later add user auth and want to expose a tenant_memberships
-- table, replace this with a policy like:
--
--   create policy "tenant members read own leads"
--     on public.leads for select
--     using (
--       tenant_id in (
--         select tenant_id from public.tenant_memberships
--         where user_id = auth.uid()
--       )
--     );
--
-- For now we explicitly create a deny policy so it is visible during
-- the demo that no anon access is possible.

drop policy if exists "deny all anon" on public.leads;
create policy "deny all anon"
  on public.leads
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- Optional: seed two tenant ids that match .env.local.example fixtures.
-- Useful for the demo so both panes have rows.
-- insert into public.leads (tenant_id, company_name, contact_email, status, exclusion_reason)
-- values
--   ('00000000-0000-0000-0000-000000000001', 'Seed Co A', 'hello@seedco-a.test', 'outbound_ready', null),
--   ('00000000-0000-0000-0000-000000000002', 'Seed Co B', null, 'excluded', 'missing_email');
