-- Slice 0127: counts-only retention-pressure boundary for the Assessment
-- execution snapshot family.
--
-- WHY THIS EXISTS
--
-- E2E-4 will drive a full assessment cycle through the browser, and generation
-- writes three tables the E2E lifecycle had no way to see:
--
--     public.assessment_execution_snapshots
--     public.assessment_execution_snapshot_sections
--     public.assessment_execution_snapshot_questions
--
-- They matter to teardown for a specific reason. Each one cascades from
-- `companies` on its own `company_id` edge, which looks harmless, but each also
-- carries `ON DELETE RESTRICT` foreign keys to SIBLINGS that cascade from the
-- same company — snapshots to `assessment_cycles` and `assessment_templates`
-- (0114:35,38), sections to snapshots and `assessment_sections` (0114:63,66),
-- questions to snapshots, sections, `assessment_questions` and `competencies`
-- (0114:104,110,115,117). Deleting the company therefore asks Postgres to remove
-- parent and child in one statement with a RESTRICT edge between them, and
-- RESTRICT is checked immediately rather than deferred the way NO ACTION is.
-- Whether that aborts depends on the order the referential-integrity triggers
-- happen to fire. The harness does not claim the delete fails; it declines to
-- claim it succeeds, and a run holding these rows is retired rather than
-- deleted. Retirement removes nothing, so it is always the safe answer.
--
-- To make that decision the classifier needs one number per table. It cannot get
-- it: migration 0114 line 885 did
--
--     revoke all on table
--       public.assessment_execution_snapshots,
--       public.assessment_execution_snapshot_sections,
--       public.assessment_execution_snapshot_questions
--     from public, anon, authenticated, service_role;
--
-- and `BYPASSRLS` does not bypass table privileges. A direct probe answers HTTP
-- 403, which the classifier correctly refuses to read as "empty" — so listing
-- these tables as retention entries without a boundary would make EVERY run
-- unclassifiable and stop teardown mutating anything at all.
--
-- Restoring SELECT to `service_role` would fix the harness by dismantling a
-- deliberate product boundary: the snapshot family is the immutable record of
-- what an assessment actually asked, and it is reachable only through the 0114
-- SECURITY DEFINER read functions. This migration does not reverse that revoke.
-- It answers the counting question and nothing else. A caller learns a number;
-- it can never learn a question, an answer, a competency name or a scale.
--
-- WHY A SEPARATE FUNCTION RATHER THAN EXTENDING 0126
--
-- `get_company_retention_pressure_v1` (0126) already does exactly this shape of
-- job for the four development-template ledger tables whose SELECT migration
-- 0069 revoked. Folding three assessment relations into it was considered and
-- rejected:
--
--   * the two families exist for unrelated reasons — 0069 protects a write
--     ledger, 0114 protects an immutable execution record — and their revokes
--     will not be lifted or tightened together. Two functions can be granted,
--     revoked, audited or dropped independently; one cannot;
--   * 0126's own scope note already anticipated this case and called the
--     assessment family "a different retention contract", saying it would need
--     "its own reviewed extension" rather than being "folded in silently";
--   * 0126's reviewed pgTAP asserts that the boundary reports EXACTLY the four
--     ledger relations. Extending the function would mean rewriting an
--     already-reviewed security assertion, which is a cost, not a saving;
--   * one EXECUTE grant would then confer count-visibility across two domains.
--
-- The cost of the split is that the E2E classifier now calls two boundaries
-- instead of one. That is metadata in the retention registry, not new privilege.
--
-- WHAT THIS MIGRATION DOES NOT DO
--
--   * does not grant SELECT on any table, to any role;
--   * does not alter migration 0114 or 0126, or any existing grant, policy, RLS
--     or ownership;
--   * does not touch data, columns, constraints, indexes or triggers;
--   * uses no ALTER DEFAULT PRIVILEGES and no CASCADE;
--   * accepts no relation name from the caller and builds no dynamic SQL — the
--     three relations are a closed, reviewable list in the function body;
--   * performs no mutation and calls no audited RPC, so inspecting a tenant can
--     never create the evidence the caller is inspecting for.

create or replace function public.get_company_assessment_snapshot_pressure_v1(
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
  select 'assessment_execution_snapshots'::text,
         count(*)::bigint
  from public.assessment_execution_snapshots
  where company_id = p_company_id

  union all
  select 'assessment_execution_snapshot_sections'::text,
         count(*)::bigint
  from public.assessment_execution_snapshot_sections
  where company_id = p_company_id

  union all
  select 'assessment_execution_snapshot_questions'::text,
         count(*)::bigint
  from public.assessment_execution_snapshot_questions
  where company_id = p_company_id;
$$;

comment on function public.get_company_assessment_snapshot_pressure_v1(uuid) is
  'Counts-only retention pressure for the three Assessment execution snapshot tables whose SELECT is revoked from service_role by migration 0114. Returns relation_name and row_count for one company; never row payload, never another tenant, never a caller-supplied relation. Used by the E2E lifecycle classifier to choose CLEANED vs RETIRED without weakening the 0114 boundary. Companion to get_company_retention_pressure_v1 (0126), kept separate because the two revokes protect different domains.';

-- Closed by default, then opened to exactly one role.
revoke all on function public.get_company_assessment_snapshot_pressure_v1(uuid)
from public, anon, authenticated;

grant execute on function public.get_company_assessment_snapshot_pressure_v1(uuid)
to service_role;

notify pgrst, 'reload schema';

-- Rollback strategy:
--   drop function public.get_company_assessment_snapshot_pressure_v1(uuid);
-- Nothing else is touched, so dropping it restores the previous state exactly —
-- the E2E classifier simply becomes unable to classify these three tables again,
-- which is where E4-S1 left it.
