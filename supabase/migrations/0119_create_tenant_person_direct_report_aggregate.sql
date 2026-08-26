-- Purpose-bound ANONYMOUS aggregate of one Person's `direct_report` (upward)
-- Assessment Results. Implements PD-022 (Direct-Report Anonymity & Aggregation
-- Policy) and ADR-0018 (Direct-Report Anonymity & Aggregation Architecture).
--
-- Scoring authority is unchanged: this boundary reuses the shared private helper
-- `compute_assessment_scored_result_v1` per response (snapshot-based) and only
-- AGGREGATES AFTER individual scoring. It never duplicates the formula, never
-- reads live Questions, and never exposes individual responses.
--
-- ANONYMITY INVARIANTS (PD-022 / ADR-0018):
--  * anonymity set = (company, Person/evaluatee, Cycle); cycles are NEVER
--    combined and there is no rolling aggregate;
--  * threshold k = 4 eligible responses per (Person, Cycle). Below k the row is
--    SUPPRESSED and leaks NOTHING: no score, no count, no metadata (fail-closed);
--  * eligible = perspective = 'direct_report' AND status IN ('submitted',
--    'completed') AND cycle.assessment_visibility <> 'none' (none never
--    participates in the aggregate nor in the cardinality);
--  * the PUBLIC contract exposes NO respondent_count/cardinality, response_id,
--    evaluator_id, evaluator identity, individual timestamps/status, raw_score,
--    min/max, distribution or ordering. Cardinality is INTERNAL only, used to
--    apply k;
--  * owner/admin/hr receive ONLY the aggregate — no individual/drill-down; other
--    roles and cross-tenant callers are denied with an identical message so
--    Person existence cannot be inferred;
--  * exactly one administrative audit event per aggregate read (not per
--    response).
--
-- Quantitative anonymity (PD-022 refined rule): the threshold k also protects
-- every DERIVED datum that could enable inference, not only people. A quantitative
-- metric may cross the boundary only if its own anonymity set is >= k. This yields
-- four states per (Person, Cycle), where eligible_count/scored_count are INTERNAL:
--
--   1. eligible_count < k                  => SUPPRESSED
--        aggregate_score = null; is_qualitative = false; no cardinality, no metadata.
--   2. eligible_count >= k AND scored >= k => QUANTITATIVE
--        aggregate_score = mean of the eligible quantitative overallScores.
--   3. eligible_count >= k AND scored = 0  => QUALITATIVE
--        aggregate_score = null; is_qualitative = true ("Resultado qualitativo").
--   4. eligible_count >= k AND scored 1..3 => SUPPRESSED (NOT qualitative)
--        the quantitative anonymity set would be < k, so it is treated exactly
--        like case 1 and is INDISTINGUISHABLE from it: aggregate_score = null,
--        is_qualitative = false. The existence of 1/2/3 scores, scored_count,
--        eligible_count and any partial mean are never revealed.
--
-- The three public states map to distinct combinations of the minimized contract:
--   QUANTITATIVE = (suppressed=false, is_qualitative=false, aggregate_score=<n>)
--   QUALITATIVE  = (suppressed=false, is_qualitative=true,  aggregate_score=null)
--   SUPPRESSED   = (suppressed=true,  is_qualitative=false, aggregate_score=null)
-- No cardinality column is needed or added. NULL is never converted to zero.

create or replace function public.get_tenant_person_direct_report_aggregate_v1(
  p_company_id uuid,
  p_person_id uuid
)
returns table(
  cycle_id uuid,
  cycle_name text,
  model_name text,
  cycle_date date,
  aggregate_score numeric,
  is_qualitative boolean,
  suppressed boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_role text;
  v_threshold constant integer := 4;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  select membership.role
  into v_role
  from public.company_members membership
  where membership.company_id = p_company_id
    and membership.user_id = auth.uid()
    and membership.status = 'active';

  if public.is_company_member(p_company_id) is not true
    or v_role is null
    or v_role not in ('owner', 'admin', 'hr') then
    raise exception using errcode = '42501', message = 'ASSESSMENT_DIRECT_REPORT_AGGREGATE_FORBIDDEN';
  end if;

  if not exists (
    select 1
    from public.people person
    where person.id = p_person_id
      and person.company_id = p_company_id
  ) then
    raise exception using errcode = '42501', message = 'ASSESSMENT_DIRECT_REPORT_AGGREGATE_FORBIDDEN';
  end if;

  perform public.audit_secure_administrative_read(
    p_company_id,
    'assessments',
    'person',
    p_person_id,
    'read_person_direct_report_aggregate',
    'view_direct_report_aggregate'
  );

  return query
  with eligible as (
    select
      cycle.id as cycle_id,
      cycle.name as cycle_name,
      snapshot.template_name as model_name,
      coalesce(cycle.close_date, cycle.end_date, cycle.start_date) as cycle_date,
      nullif(
        public.compute_assessment_scored_result_v1(p_company_id, response.id) ->> 'overallScore',
        ''
      )::numeric as overall_score
    from public.assessment_responses response
    join public.assessment_cycles cycle
      on cycle.id = response.assessment_cycle_id
     and cycle.company_id = response.company_id
    join public.assessment_execution_snapshots snapshot
      on snapshot.id = response.assessment_execution_snapshot_id
     and snapshot.company_id = response.company_id
     and snapshot.assessment_cycle_id = response.assessment_cycle_id
    where response.company_id = p_company_id
      and response.employee_id = p_person_id
      and response.status in ('submitted', 'completed')
      and response.perspective = 'direct_report'
      and cycle.assessment_visibility <> 'none'
  ),
  per_cycle as (
    select
      eligible.cycle_id,
      eligible.cycle_name,
      eligible.model_name,
      eligible.cycle_date,
      count(*) as eligible_count,
      count(eligible.overall_score) as scored_count,
      avg(eligible.overall_score) filter (where eligible.overall_score is not null) as avg_score
    from eligible
    group by
      eligible.cycle_id,
      eligible.cycle_name,
      eligible.model_name,
      eligible.cycle_date
  )
  select
    per_cycle.cycle_id,
    per_cycle.cycle_name,
    per_cycle.model_name,
    per_cycle.cycle_date,
    case
      when per_cycle.eligible_count >= v_threshold
        and per_cycle.scored_count >= v_threshold
      then per_cycle.avg_score
      else null
    end as aggregate_score,
    -- QUALITATIVE only when the cohort has >= k eligible responses and ZERO scores.
    (per_cycle.eligible_count >= v_threshold and per_cycle.scored_count = 0) as is_qualitative,
    -- SUPPRESSED when the cohort is sub-threshold OR the quantitative subset is
    -- sub-threshold (1..k-1 scores). Both cases are indistinguishable to callers.
    (
      per_cycle.eligible_count < v_threshold
      or (
        per_cycle.eligible_count >= v_threshold
        and per_cycle.scored_count between 1 and v_threshold - 1
      )
    ) as suppressed
  from per_cycle
  order by per_cycle.cycle_date desc, per_cycle.cycle_id;
end;
$$;

revoke all on function public.get_tenant_person_direct_report_aggregate_v1(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_tenant_person_direct_report_aggregate_v1(uuid, uuid)
  to authenticated;

notify pgrst, 'reload schema';
