-- =============================================================================
-- 003_extend_exclusion_reasons.sql — Add suppressed and unsubscribed reasons
--
-- Apply via Supabase Dashboard → SQL Editor → New query → paste → Run.
--
-- Extends the exclusion_reason enum with new values for suppression features.
-- This MUST be in a separate migration from 002 because ALTER TYPE ... ADD VALUE
-- cannot run inside a transaction block with other DDL.
--
-- See docs/ADR-004-suppression-and-unsubscribe.md for rationale.
-- =============================================================================

-- Extend exclusion_reason enum -------------------------------------------
-- Add new values if they don't already exist (idempotent).
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumlabel = 'suppressed'
    and enumtypid = 'exclusion_reason'::regtype
  ) then
    alter type exclusion_reason add value 'suppressed';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumlabel = 'unsubscribed'
    and enumtypid = 'exclusion_reason'::regtype
  ) then
    alter type exclusion_reason add value 'unsubscribed';
  end if;
end$$;

-- =============================================================================
-- End of migration 003
-- =============================================================================
