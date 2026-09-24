-- L-DB1: purpose-bound Leadership attention read boundary.
--
-- Leadership is a live read projection. It owns no durable alert state and
-- performs no domain mutation. The function derives the actor and current
-- direct reports from the authenticated session, then projects only the six
-- factual reasons frozen by L-P1. Owning-domain detail and mutation boundaries
-- remain authoritative at the destination.

do $$
begin
  if exists (
    select 1
    from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname = 'get_manager_leadership_attention_v1'
  ) then
    raise exception using
      errcode = '42710',
      message = 'LEADERSHIP_ATTENTION_FUNCTION_PREFLIGHT_FAILED';
  end if;

  if to_regclass('public.people') is null
    or to_regclass('public.assessment_cycles') is null
    or to_regclass('public.assessment_responses') is null
    or to_regclass('public.feedback_threads') is null
    or to_regclass('public.development_plans') is null
    or to_regclass('public.development_goals') is null
    or to_regclass('public.development_actions') is null
    or to_regprocedure('public.development_actor_person_id_v1(uuid)') is null
    or to_regprocedure('public.can_read_development_plan_v1(uuid)') is null
  then
    raise exception using
      errcode = '55000',
      message = 'LEADERSHIP_ATTENTION_DEPENDENCY_PREFLIGHT_FAILED';
  end if;
end;
$$;

create function public.get_manager_leadership_attention_v1(
  p_company_id uuid
)
returns table (
  subject_id uuid,
  subject_name text,
  subject_status text,
  reason text,
  priority text,
  source_type text,
  source_id uuid,
  source_status text,
  due_date date,
  source_version bigint,
  source_updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_person_id uuid;
  v_server_date date := current_date;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.is_company_member(p_company_id) then
    raise exception using
      errcode = '42501',
      message = 'TENANT_AUTHORIZATION_DENIED';
  end if;

  v_actor_person_id := public.development_actor_person_id_v1(p_company_id);
  if v_actor_person_id is null then
    raise exception using
      errcode = '42501',
      message = 'LEADERSHIP_ACTOR_UNAVAILABLE';
  end if;

  return query
  with direct_reports as materialized (
    select person.id, person.full_name, person.status
    from public.people person
    where person.company_id = p_company_id
      and person.manager_id = v_actor_person_id
      and person.status in ('active', 'on_leave')
  ),
  assessment_attention as (
    select
      subject.id as subject_id,
      subject.full_name as subject_name,
      subject.status as subject_status,
      case
        when cycle.end_date < v_server_date then 'assigned_assessment_overdue'
        else 'assigned_assessment_pending'
      end as reason,
      case
        when cycle.end_date < v_server_date then 'high'
        else 'medium'
      end as priority,
      'assessment_response'::text as source_type,
      response.id as source_id,
      response.status as source_status,
      cycle.end_date as due_date,
      null::bigint as source_version,
      response.updated_at as source_updated_at
    from direct_reports subject
    join public.assessment_responses response
      on response.company_id = p_company_id
     and response.employee_id = subject.id
     and response.evaluator_id = v_actor_person_id
     and response.perspective = 'manager'
     and response.status in ('draft', 'in_progress')
    join public.assessment_cycles cycle
      on cycle.id = response.assessment_cycle_id
     and cycle.company_id = response.company_id
     and cycle.status = 'active'
     and cycle.deleted_at is null
  ),
  feedback_attention as (
    select
      subject.id as subject_id,
      subject.full_name as subject_name,
      subject.status as subject_status,
      'formal_feedback_pending'::text as reason,
      'medium'::text as priority,
      'assessment_response'::text as source_type,
      response.id as source_id,
      response.status as source_status,
      null::date as due_date,
      null::bigint as source_version,
      response.updated_at as source_updated_at
    from direct_reports subject
    join public.assessment_responses response
      on response.company_id = p_company_id
     and response.employee_id = subject.id
     and response.evaluator_id = v_actor_person_id
     and response.perspective = 'manager'
     and response.status in ('submitted', 'completed')
    where subject.status = 'active'
      and response.evaluator_id <> response.employee_id
      and not exists (
        select 1
        from public.feedback_threads thread
        where thread.company_id = response.company_id
          and thread.assessment_response_id = response.id
      )
  ),
  authorized_active_plans as materialized (
    select
      plan.id,
      plan.employee_id,
      plan.status,
      plan.due_date,
      plan.version,
      plan.updated_at
    from public.development_plans plan
    join direct_reports subject on subject.id = plan.employee_id
    where plan.company_id = p_company_id
      and plan.status = 'active'
      and public.can_read_development_plan_v1(plan.id)
  ),
  active_plan_due_dates as (
    select
      plan.id as plan_id,
      least(
        plan.due_date,
        min(action.due_date) filter (
          where action.status in ('pending', 'in_progress')
            and action.due_date is not null
        )
      ) as combined_due_date,
      plan.due_date as plan_due_date,
      min(action.due_date) filter (
        where action.status in ('pending', 'in_progress')
          and action.due_date is not null
      ) as action_due_date
    from authorized_active_plans plan
    left join public.development_goals goal
      on goal.company_id = p_company_id
     and goal.plan_id = plan.id
    left join public.development_actions action
      on action.company_id = p_company_id
     and action.goal_id = goal.id
    group by plan.id, plan.due_date
  ),
  normalized_plan_due_dates as (
    select
      plan_id,
      case
        when plan_due_date is null then action_due_date
        when action_due_date is null then plan_due_date
        else combined_due_date
      end as due_date
    from active_plan_due_dates
  ),
  development_attention as (
    select
      subject.id as subject_id,
      subject.full_name as subject_name,
      subject.status as subject_status,
      case
        when due.due_date < v_server_date then 'development_follow_up_overdue'
        else 'development_follow_up_due'
      end as reason,
      case
        when due.due_date < v_server_date then 'high'
        else 'medium'
      end as priority,
      'development_plan'::text as source_type,
      plan.id as source_id,
      plan.status as source_status,
      due.due_date,
      plan.version as source_version,
      plan.updated_at as source_updated_at
    from authorized_active_plans plan
    join normalized_plan_due_dates due on due.plan_id = plan.id
    join direct_reports subject on subject.id = plan.employee_id
    where due.due_date <= (v_server_date + 30)
  ),
  missing_development_attention as (
    select
      subject.id as subject_id,
      subject.full_name as subject_name,
      subject.status as subject_status,
      'development_plan_missing'::text as reason,
      'low'::text as priority,
      'development_subject'::text as source_type,
      subject.id as source_id,
      'missing'::text as source_status,
      null::date as due_date,
      null::bigint as source_version,
      null::timestamptz as source_updated_at
    from direct_reports subject
    where not exists (
      select 1
      from public.development_plans plan
      where plan.company_id = p_company_id
        and plan.employee_id = subject.id
        and plan.status in ('draft', 'active')
        and public.can_read_development_plan_v1(plan.id)
    )
  ),
  attention as (
    select * from assessment_attention
    union all
    select * from feedback_attention
    union all
    select * from development_attention
    union all
    select * from missing_development_attention
  )
  select
    attention.subject_id,
    attention.subject_name,
    attention.subject_status,
    attention.reason,
    attention.priority,
    attention.source_type,
    attention.source_id,
    attention.source_status,
    attention.due_date,
    attention.source_version,
    attention.source_updated_at
  from attention
  order by
    case attention.priority when 'high' then 1 when 'medium' then 2 else 3 end,
    attention.due_date asc nulls last,
    attention.reason,
    attention.subject_name,
    attention.subject_id;
end;
$$;

revoke all on function public.get_manager_leadership_attention_v1(uuid)
from public, anon, authenticated, service_role;

grant execute on function public.get_manager_leadership_attention_v1(uuid)
to authenticated;

comment on function public.get_manager_leadership_attention_v1(uuid) is
  'Returns the deterministic live Leadership attention projection for the authenticated actor current direct reports only; it creates no durable Leadership state.';

notify pgrst, 'reload schema';
