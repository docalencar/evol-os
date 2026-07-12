-- =====================================================
-- Apply Development Template Transaction
-- =====================================================
--
-- Creates a complete Development Plan from a Template.
--
-- The PostgreSQL function call runs inside a single
-- transaction. If any validation or INSERT fails, the
-- complete operation is rolled back automatically.
--
-- The resulting plan is an independent snapshot.
-- Future Template changes do not update created plans.
-- =====================================================

create or replace function public.apply_development_template(
  p_company_id uuid,
  p_employee_id uuid,
  p_template_id uuid,
  p_priority text default 'medium',
  p_owner_id uuid default null,
  p_start_date date default null,
  p_due_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_authenticated_user_id uuid;

  v_template record;
  v_template_goal record;
  v_template_action record;

  v_plan_id uuid;
  v_goal_id uuid;

  v_current_level integer;
begin
  -- ===================================================
  -- Authentication
  -- ===================================================

  v_authenticated_user_id := auth.uid();

  if v_authenticated_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'AUTHENTICATION_REQUIRED';
  end if;

  -- ===================================================
  -- Required parameters
  -- ===================================================

  if p_company_id is null then
    raise exception using
      errcode = '22004',
      message = 'COMPANY_ID_REQUIRED';
  end if;

  if p_employee_id is null then
    raise exception using
      errcode = '22004',
      message = 'EMPLOYEE_ID_REQUIRED';
  end if;

  if p_template_id is null then
    raise exception using
      errcode = '22004',
      message = 'TEMPLATE_ID_REQUIRED';
  end if;

  -- ===================================================
  -- Authorization
  -- ===================================================

  if not public.has_company_role(
    p_company_id,
    array['owner', 'admin', 'hr']
  ) then
    raise exception using
      errcode = '42501',
      message = 'DEVELOPMENT_PLAN_PERMISSION_DENIED';
  end if;

  -- ===================================================
  -- Company validation
  -- ===================================================

  if not exists (
    select 1
    from public.companies company
    where company.id = p_company_id
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'COMPANY_NOT_FOUND';
  end if;

  -- ===================================================
  -- Employee validation
  -- ===================================================

  if not exists (
    select 1
    from public.people employee
    where employee.id = p_employee_id
      and employee.company_id = p_company_id
      and employee.status <> 'terminated'
  ) then
    raise exception using
      errcode = 'P0002',
      message = 'EMPLOYEE_NOT_FOUND';
  end if;

  -- ===================================================
  -- Owner validation
  -- ===================================================

  if p_owner_id is not null
    and not exists (
      select 1
      from public.people owner
      where owner.id = p_owner_id
        and owner.company_id = p_company_id
        and owner.status <> 'terminated'
    )
  then
    raise exception using
      errcode = 'P0002',
      message = 'DEVELOPMENT_PLAN_OWNER_NOT_FOUND';
  end if;

  -- ===================================================
  -- Priority validation
  -- ===================================================

  if p_priority is null
    or p_priority not in (
      'low',
      'medium',
      'high'
    )
  then
    raise exception using
      errcode = '22023',
      message = 'INVALID_DEVELOPMENT_PLAN_PRIORITY';
  end if;

  -- ===================================================
  -- Date validation
  -- ===================================================

  if p_start_date is not null
    and p_due_date is not null
    and p_due_date < p_start_date
  then
    raise exception using
      errcode = '22023',
      message = 'DEVELOPMENT_PLAN_DUE_DATE_BEFORE_START_DATE';
  end if;

  -- ===================================================
  -- Template validation
  -- ===================================================

  select
    template.id,
    template.company_id,
    template.name,
    template.description,
    template.scope,
    template.suggested_duration_days,
    template.active
  into v_template
  from public.development_templates template
  where template.id = p_template_id
    and template.active = true
    and (
      (
        template.scope = 'global'
        and template.company_id is null
      )
      or
      (
        template.scope = 'company'
        and template.company_id = p_company_id
      )
    );

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'DEVELOPMENT_TEMPLATE_NOT_FOUND';
  end if;

  -- ===================================================
  -- Template Goals validation
  -- ===================================================

  if not exists (
    select 1
    from public.development_template_goals template_goal
    where template_goal.template_id = p_template_id
  ) then
    raise exception using
      errcode = '22023',
      message = 'DEVELOPMENT_TEMPLATE_HAS_NO_GOALS';
  end if;

  if exists (
    select 1
    from public.development_template_goals template_goal
    where template_goal.template_id = p_template_id
      and template_goal.competency_id is null
  ) then
    raise exception using
      errcode = '22023',
      message = 'DEVELOPMENT_TEMPLATE_GOAL_WITHOUT_COMPETENCY';
  end if;

  if exists (
    select 1
    from public.development_template_goals template_goal
    left join public.competencies competency
      on competency.id = template_goal.competency_id
    where template_goal.template_id = p_template_id
      and (
        competency.id is null
        or competency.active = false
        or (
          competency.company_id is not null
          and competency.company_id <> p_company_id
        )
      )
  ) then
    raise exception using
      errcode = '22023',
      message = 'DEVELOPMENT_TEMPLATE_HAS_INVALID_COMPETENCY';
  end if;

  if exists (
    select 1
    from public.development_template_goals template_goal
    where template_goal.template_id = p_template_id
      and template_goal.suggested_target_level is null
  ) then
    raise exception using
      errcode = '22023',
      message = 'DEVELOPMENT_TEMPLATE_GOAL_WITHOUT_TARGET_LEVEL';
  end if;

  -- ===================================================
  -- Create Development Plan
  -- ===================================================

  insert into public.development_plans (
    company_id,
    employee_id,
    created_by,
    owner_id,
    template_id,
    title,
    description,
    status,
    priority,
    start_date,
    due_date,
    updated_at
  )
  values (
    p_company_id,
    p_employee_id,
    v_authenticated_user_id,
    p_owner_id,
    p_template_id,
    v_template.name,
    v_template.description,
    'draft',
    p_priority,
    p_start_date,
    p_due_date,
    now()
  )
  returning id
  into v_plan_id;

  -- ===================================================
  -- Copy Template Goals
  -- ===================================================

  for v_template_goal in
    select
      template_goal.id as template_goal_id,
      template_goal.competency_id,
      template_goal.description,
      template_goal.suggested_target_level,
      template_goal.order_index,
      competency.name as competency_name,
      competency.expected_level
    from public.development_template_goals template_goal
    join public.competencies competency
      on competency.id = template_goal.competency_id
    where template_goal.template_id = p_template_id
    order by
      template_goal.order_index asc,
      template_goal.created_at asc,
      template_goal.id asc
  loop
    -- ================================================
    -- Resolve current employee level
    -- ================================================

    select employee_competency.current_level
    into v_current_level
    from public.employee_competencies employee_competency
    where employee_competency.company_id = p_company_id
      and employee_competency.employee_id = p_employee_id
      and employee_competency.competency_id =
        v_template_goal.competency_id
      and employee_competency.archived_at is null
    limit 1;

    v_current_level := coalesce(
      v_current_level,
      0
    );

    -- ================================================
    -- Protect Development Goal constraint
    --
    -- development_goals requires:
    -- target_level >= current_level
    -- ================================================

    if v_template_goal.suggested_target_level
      < v_current_level
    then
      raise exception using
        errcode = '22023',
        message =
          'DEVELOPMENT_TEMPLATE_TARGET_BELOW_CURRENT_LEVEL',
        detail = format(
          'Competency "%s" has current level %s and target level %s.',
          v_template_goal.competency_name,
          v_current_level,
          v_template_goal.suggested_target_level
        );
    end if;

    -- ================================================
    -- Create Development Goal snapshot
    -- ================================================

    insert into public.development_goals (
      company_id,
      plan_id,
      competency_id,
      title,
      description,
      current_level,
      expected_level,
      target_level,
      status,
      updated_at
    )
    values (
      p_company_id,
      v_plan_id,
      v_template_goal.competency_id,
      v_template_goal.competency_name,
      v_template_goal.description,
      v_current_level,
      v_template_goal.expected_level,
      v_template_goal.suggested_target_level,
      'not_started',
      now()
    )
    returning id
    into v_goal_id;

    -- ================================================
    -- Copy Template Actions
    -- ================================================

    for v_template_action in
      select
        template_action.id,
        template_action.title,
        template_action.description,
        template_action.type,
        template_action.suggested_due_days,
        template_action.order_index
      from public.development_template_actions template_action
      where template_action.template_goal_id =
        v_template_goal.template_goal_id
      order by
        template_action.order_index asc,
        template_action.created_at asc,
        template_action.id asc
    loop
      insert into public.development_actions (
        company_id,
        goal_id,
        title,
        description,
        type,
        status,
        due_date,
        updated_at
      )
      values (
        p_company_id,
        v_goal_id,
        v_template_action.title,
        v_template_action.description,
        v_template_action.type,
        'pending',
        case
          when p_start_date is not null
            and v_template_action.suggested_due_days
              is not null
          then
            p_start_date
            + v_template_action.suggested_due_days
          else null
        end,
        now()
      );
    end loop;
  end loop;

  -- ===================================================
  -- Result
  -- ===================================================

  return v_plan_id;
end;
$$;

-- =====================================================
-- Function permissions
-- =====================================================

revoke all
on function public.apply_development_template(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  date,
  date
)
from public;

grant execute
on function public.apply_development_template(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  date,
  date
)
to authenticated;

comment on function public.apply_development_template(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  date,
  date
)
is
  'Atomically creates a Development Plan snapshot from a Development Template.';
  