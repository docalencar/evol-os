-- Slice 0126: counts-only retention-pressure boundary for the E2E lifecycle.
--
-- WHY THIS EXISTS
--
-- The E2E harness must decide, before it mutates anything, whether a run-owned
-- tenant can be physically deleted or must instead be retired. That decision is a
-- function of one question per company-scoped table: "does it hold any rows?" —
-- because `activity_events` and friends are immutable, and the development
-- template ledger is `ON DELETE RESTRICT` straight to `companies` (0068:226).
--
-- For almost every such table `service_role` may simply count rows. For four of
-- them it may not: migration 0069 lines 89-94 explicitly did
--
--     revoke all on table
--       public.development_template_applications,
--       public.development_template_application_attempts,
--       public.development_template_application_snapshots,
--       public.development_template_application_lineage
--     from service_role;
--
-- That revoke is a deliberate product boundary — the ledger is reachable only
-- through the three SECURITY DEFINER reserve/complete/fail functions — and this
-- migration does NOT reverse it. A direct probe therefore returns HTTP 403, which
-- the classifier correctly refuses to interpret as "empty", leaving every run
-- permanently unclassifiable.
--
-- Restoring `SELECT` to `service_role` would fix the harness by weakening the
-- product. This boundary is the narrower alternative: it answers the counting
-- question and nothing else. A caller learns a number; it can never learn a row.
--
-- WHAT THIS MIGRATION DOES NOT DO
--
--   * does not grant SELECT on any table, to any role;
--   * does not alter migration 0069, or any existing grant, policy or RLS;
--   * does not touch data, columns, constraints, indexes, triggers or ownership;
--   * uses no ALTER DEFAULT PRIVILEGES and no CASCADE;
--   * accepts no relation name from the caller and builds no dynamic SQL — the
--     four relations are a closed, reviewable list in the function body;
--   * performs no mutation and calls no audited RPC, so inspecting a tenant can
--     never create the audit evidence the caller is inspecting for.
--
-- SCOPE NOTE (audited, deliberately excluded)
--
-- A full sweep for `revoke ... from service_role` across all 125 prior migrations
-- found exactly three families: the four ledger tables above;
-- `development_template_application_audit` (0069:86, revoked from service_role
-- too but NOT a retention-registry entry); and
-- `assessment_execution_snapshots` + `_sections` + `_questions` (0114:885). The
-- assessment family is a different retention contract and is not in the E2E
-- retention registry today, so it is deliberately NOT covered here rather than
-- folded in silently. If it is ever added to the registry, it needs its own
-- reviewed extension of this list.

create or replace function public.get_company_retention_pressure_v1(
  p_company_id uuid
)
returns table (
  relation_name text,
  row_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  -- A null company matches nothing, so every count is 0 rather than an error or
  -- an accidental cross-tenant total. Explicit equality also means a null can
  -- never widen into "all companies".
  select 'development_template_applications'::text,
         count(*)::bigint
  from public.development_template_applications
  where company_id = p_company_id

  union all
  select 'development_template_application_attempts'::text,
         count(*)::bigint
  from public.development_template_application_attempts
  where company_id = p_company_id

  union all
  select 'development_template_application_snapshots'::text,
         count(*)::bigint
  from public.development_template_application_snapshots
  where company_id = p_company_id

  union all
  select 'development_template_application_lineage'::text,
         count(*)::bigint
  from public.development_template_application_lineage
  where company_id = p_company_id;
$$;

comment on function public.get_company_retention_pressure_v1(uuid) is
  'Counts-only retention pressure for the four development-template ledger tables whose SELECT is revoked from service_role by migration 0069. Returns relation_name and row_count for one company; never row payload, never another tenant, never a caller-supplied relation. Used by the E2E lifecycle classifier to choose CLEANED vs RETIRED without weakening the 0069 boundary.';

-- Closed by default, then opened to exactly one role.
revoke all on function public.get_company_retention_pressure_v1(uuid)
from public, anon, authenticated;

grant execute on function public.get_company_retention_pressure_v1(uuid)
to service_role;

notify pgrst, 'reload schema';

-- Rollback strategy:
--   drop function public.get_company_retention_pressure_v1(uuid);
-- Nothing else is touched, so dropping it restores the previous state exactly —
-- the E2E classifier simply becomes unable to classify these four tables again.
