-- E-DB1 — trusted aggregated Assessment summary read, company scope.
--
-- WHY A NEW BOUNDARY AND NOT A NEW SCOPE ON 0062
--
-- `read_assessment_administratively` returns, for whatever scope it is given,
-- every matching response as `to_jsonb(ar)` plus EVERY `assessment_answers` row,
-- and joins in each employee's and evaluator's `full_name` and `email`.
-- Adding a `'company'` scope to it would turn an entity read into a company-wide
-- export of assessment answers and contact details — the most sensitive payload
-- the module has — to satisfy a consumer that needs three integers per person.
--
-- Employee Intelligence consumes exactly `EmployeeAssessmentSummary`:
--   completedAssessments, pendingAssessments, latestAssessmentAt
-- and `averageScore`, which `summarize-employee-assessments.ts` hardcodes to null
-- and is therefore not read at all. No answer, no score, no response body, no
-- name and no email is required.
--
-- So this boundary returns aggregates only. It is strictly LESS exposure than
-- what `owner`/`admin`/`hr` can already obtain today: the existing `'cycle'`
-- scope already returns every response and answer of a cycle. No role gains a
-- capability here, and no policy changes.
--
-- AUTHORIZATION AND AUDIT ARE NOT REIMPLEMENTED
--
-- `audit_secure_administrative_read` is the single enforcement point already used
-- by 0062: it rejects an anonymous caller (AUTH_REQUIRED), rejects an actor
-- without owner/admin/hr in THIS company (ADMINISTRATIVE_READ_FORBIDDEN),
-- validates the reason format (ADMINISTRATIVE_READ_REASON_REQUIRED) and writes
-- exactly one restricted activity event. Calling it once, before any read, gives
-- this boundary the same posture and one audit event per aggregated read instead
-- of one per employee.
--
-- Tenancy is not taken from the caller as authority: the role check is performed
-- against `p_company_id` by the audit function, and every aggregate below is
-- filtered by that same `company_id`.
--
-- Deliberately NOT changed: 0062, its scope union, its grants, any policy, any
-- RLS, and Employee Intelligence itself. This slice only adds the boundary.

create function public.get_company_assessment_summary_v1(
  p_company_id uuid,
  p_reason text
)
returns table (
  employee_id uuid,
  completed_assessments integer,
  pending_assessments integer,
  latest_completed_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if p_company_id is null then
    raise exception using errcode = '22023', message = 'ASSESSMENT_SUMMARY_COMPANY_REQUIRED';
  end if;

  -- Authorization, reason validation and the single audit event. Anything that
  -- must refuse this call refuses here, before a row is read.
  perform public.audit_secure_administrative_read(
    p_company_id,
    'assessments',
    'assessment_company_summary',
    p_company_id,
    'read_company_summary',
    p_reason
  );

  return query
  select
    response.employee_id,
    count(*) filter (where response.status = 'completed')::integer,
    count(*) filter (
      where response.status in ('draft', 'in_progress', 'submitted')
    )::integer,
    max(response.completed_at) filter (where response.status = 'completed')
  from public.assessment_responses response
  where response.company_id = p_company_id
  group by response.employee_id
  order by response.employee_id;
end;
$$;

revoke all on function public.get_company_assessment_summary_v1(uuid, text)
from public, anon, service_role;

grant execute on function public.get_company_assessment_summary_v1(uuid, text)
to authenticated;

comment on function public.get_company_assessment_summary_v1(uuid, text) is
  'Aggregated per-employee assessment counts for one company. Administrative read: '
  'authorization, reason validation and a single audit event come from '
  'audit_secure_administrative_read. Returns counts and the latest completion '
  'timestamp only — never responses, answers, scores or identities.';

notify pgrst, 'reload schema';
