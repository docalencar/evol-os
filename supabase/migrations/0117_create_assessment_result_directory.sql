-- Purpose-bound discovery of the current Person's official Assessment results.
-- Full result content and scoring remain authoritative in the 0115/0116
-- individual scored-result boundary. Direct-report results are deliberately
-- omitted until the anonymity and aggregation policy is defined.

create or replace function public.get_current_person_assessment_result_directory_v1(
  p_company_id uuid
)
returns table(
  cycle_id uuid,
  cycle_name text,
  model_name text,
  cycle_date date,
  response_id uuid,
  perspective text,
  response_status text,
  submitted_at timestamptz,
  completed_at timestamptz,
  overall_score numeric,
  visibility text,
  result_available boolean
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_response record;
  v_scored jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'AUTH_REQUIRED';
  end if;

  if public.is_company_member(p_company_id) is not true or not exists (
    select 1
    from public.company_members membership
    where membership.company_id = p_company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  ) then
    raise exception using errcode = '42501', message = 'ASSESSMENT_RESULT_DIRECTORY_FORBIDDEN';
  end if;

  v_actor := public.current_person_id(p_company_id);
  if v_actor is null then
    raise exception using errcode = '42501', message = 'ASSESSMENT_RESULT_DIRECTORY_FORBIDDEN';
  end if;

  for v_response in
    select
      cycle.id as cycle_id,
      cycle.name as cycle_name,
      snapshot.template_name as model_name,
      coalesce(cycle.close_date, cycle.end_date, cycle.start_date) as cycle_date,
      response.id as response_id,
      response.perspective,
      response.status as response_status,
      response.submitted_at,
      response.completed_at,
      cycle.assessment_visibility as visibility
    from public.assessment_responses response
    join public.assessment_cycles cycle
      on cycle.id = response.assessment_cycle_id
     and cycle.company_id = response.company_id
    join public.assessment_execution_snapshots snapshot
      on snapshot.id = response.assessment_execution_snapshot_id
     and snapshot.company_id = response.company_id
     and snapshot.assessment_cycle_id = response.assessment_cycle_id
    where response.company_id = p_company_id
      and response.employee_id = v_actor
      and response.status in ('submitted', 'completed')
      and cycle.assessment_visibility <> 'none'
      and response.perspective <> 'direct_report'
    order by
      coalesce(response.submitted_at, response.completed_at, cycle.end_date::timestamptz) desc,
      response.id
  loop
    v_scored := public.get_tenant_assessment_scored_result_v1(
      p_company_id,
      v_response.response_id
    );

    cycle_id := v_response.cycle_id;
    cycle_name := v_response.cycle_name;
    model_name := v_response.model_name;
    cycle_date := v_response.cycle_date;
    response_id := v_response.response_id;
    perspective := v_response.perspective;
    response_status := v_response.response_status;
    submitted_at := v_response.submitted_at;
    completed_at := v_response.completed_at;
    overall_score := nullif(v_scored ->> 'overallScore', '')::numeric;
    visibility := v_response.visibility;
    result_available := true;
    return next;
  end loop;
end;
$$;

revoke all on function public.get_current_person_assessment_result_directory_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_current_person_assessment_result_directory_v1(uuid)
  to authenticated;

notify pgrst, 'reload schema';
