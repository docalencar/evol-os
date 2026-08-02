-- ADR-0012 — tenant-owned integrity: operational Development slice 3A

do $$
begin
  if exists (
    select 1 from public.development_plans
    group by id, company_id having count(*) > 1
  ) or exists (
    select 1 from public.development_goals
    group by id, company_id having count(*) > 1
  ) or exists (
    select 1 from public.development_actions
    group by id, company_id having count(*) > 1
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_DEVELOPMENT_DUPLICATE_CANDIDATE_KEY';
  end if;

  if exists (
    select 1
    from public.development_plans source
    left join public.people target on target.id = source.employee_id
    where target.id is null or target.company_id <> source.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_DEVELOPMENT_PLAN_EMPLOYEE';
  end if;

  if exists (
    select 1
    from public.development_plans source
    left join public.people target on target.id = source.owner_id
    where source.owner_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_DEVELOPMENT_PLAN_OWNER';
  end if;

  if exists (
    select 1
    from public.development_goals source
    left join public.development_plans target on target.id = source.plan_id
    where target.id is null or target.company_id <> source.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_DEVELOPMENT_GOAL_PLAN';
  end if;

  if exists (
    select 1
    from public.development_goals source
    left join public.competencies target on target.id = source.competency_id
    where target.id is null or target.company_id <> source.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_DEVELOPMENT_GOAL_COMPETENCY';
  end if;

  if exists (
    select 1
    from public.development_actions source
    left join public.development_goals target on target.id = source.goal_id
    where target.id is null or target.company_id <> source.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_DEVELOPMENT_ACTION_GOAL';
  end if;

  if exists (
    select id, company_id
    from (
      select id, company_id from public.development_plans
      union all
      select id, company_id from public.development_goals
      union all
      select id, company_id from public.development_actions
    ) tenant_owned_entities
    where company_id is null
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_DEVELOPMENT_NULL_COMPANY';
  end if;
end
$$;

alter table public.development_plans
  add constraint development_plans_id_company_id_key
    unique (id, company_id);
alter table public.development_goals
  add constraint development_goals_id_company_id_key
    unique (id, company_id);
alter table public.development_actions
  add constraint development_actions_id_company_id_key
    unique (id, company_id);

alter table public.development_plans
  add constraint development_plans_employee_company_fkey
    foreign key (employee_id, company_id)
    references public.people(id, company_id)
    on delete restrict not valid,
  add constraint development_plans_owner_company_fkey
    foreign key (owner_id, company_id)
    references public.people(id, company_id)
    on delete restrict not valid;

alter table public.development_goals
  add constraint development_goals_plan_company_fkey
    foreign key (plan_id, company_id)
    references public.development_plans(id, company_id)
    on delete cascade not valid,
  add constraint development_goals_competency_company_fkey
    foreign key (competency_id, company_id)
    references public.competencies(id, company_id)
    on delete restrict not valid;

alter table public.development_actions
  add constraint development_actions_goal_company_fkey
    foreign key (goal_id, company_id)
    references public.development_goals(id, company_id)
    on delete cascade not valid;

alter table public.development_plans
  validate constraint development_plans_employee_company_fkey,
  validate constraint development_plans_owner_company_fkey;
alter table public.development_goals
  validate constraint development_goals_plan_company_fkey,
  validate constraint development_goals_competency_company_fkey;
alter table public.development_actions
  validate constraint development_actions_goal_company_fkey;

create or replace function public.protect_closed_development_plan_goals()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_plan_status text;
  v_new_plan_status text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select development_plan.status
    into v_old_plan_status
    from public.development_plans development_plan
    where development_plan.id = old.plan_id
      and development_plan.company_id = old.company_id;

    if v_old_plan_status in ('completed', 'cancelled') then
      raise exception using
        errcode = '55000',
        message = 'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select development_plan.status
    into v_new_plan_status
    from public.development_plans development_plan
    where development_plan.id = new.plan_id
      and development_plan.company_id = new.company_id;

    if v_new_plan_status is null then
      raise exception using
        errcode = 'P0002',
        message = 'DEVELOPMENT_PLAN_NOT_FOUND';
    end if;

    if v_new_plan_status in ('completed', 'cancelled') then
      raise exception using
        errcode = '55000',
        message = 'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.protect_closed_development_plan_actions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_plan_status text;
  v_new_plan_status text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select development_plan.status
    into v_old_plan_status
    from public.development_goals development_goal
    join public.development_plans development_plan
      on development_plan.id = development_goal.plan_id
      and development_plan.company_id = development_goal.company_id
    where development_goal.id = old.goal_id
      and development_goal.company_id = old.company_id;

    if v_old_plan_status in ('completed', 'cancelled') then
      raise exception using
        errcode = '55000',
        message = 'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select development_plan.status
    into v_new_plan_status
    from public.development_goals development_goal
    join public.development_plans development_plan
      on development_plan.id = development_goal.plan_id
      and development_plan.company_id = development_goal.company_id
    where development_goal.id = new.goal_id
      and development_goal.company_id = new.company_id;

    if v_new_plan_status is null then
      raise exception using
        errcode = 'P0002',
        message = 'DEVELOPMENT_GOAL_OR_PLAN_NOT_FOUND';
    end if;

    if v_new_plan_status in ('completed', 'cancelled') then
      raise exception using
        errcode = '55000',
        message = 'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

alter table public.development_plans
  drop constraint development_plans_employee_id_fkey,
  drop constraint development_plans_owner_id_fkey;
alter table public.development_goals
  drop constraint development_goals_plan_id_fkey,
  drop constraint development_goals_competency_id_fkey;
alter table public.development_actions
  drop constraint development_actions_goal_id_fkey;
