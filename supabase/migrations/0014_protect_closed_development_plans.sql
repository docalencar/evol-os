-- =====================================================
-- Protect closed Development Plans
-- =====================================================
--
-- Goals and Actions that belong to completed or
-- cancelled Plans must be read-only.
--
-- This protection runs in PostgreSQL and therefore
-- applies to:
--
-- - the web application;
-- - future Server Actions;
-- - integrations;
-- - direct Supabase API calls;
-- - SQL executed by roles subject to these triggers.
-- =====================================================

-- =====================================================
-- Development Goals protection
-- =====================================================

create or replace function
public.protect_closed_development_plan_goals()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_plan_status text;
  v_new_plan_status text;
begin
  -- ---------------------------------------------------
  -- Validate the current parent Plan for UPDATE/DELETE
  -- ---------------------------------------------------

  if tg_op in ('UPDATE', 'DELETE') then
    select
      development_plan.status
    into
      v_old_plan_status
    from public.development_plans development_plan
    where development_plan.id = old.plan_id;

    if v_old_plan_status in (
      'completed',
      'cancelled'
    ) then
      raise exception using
        errcode = '55000',
        message =
          'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY';
    end if;
  end if;

  -- ---------------------------------------------------
  -- Validate the target parent Plan for INSERT/UPDATE
  -- ---------------------------------------------------

  if tg_op in ('INSERT', 'UPDATE') then
    select
      development_plan.status
    into
      v_new_plan_status
    from public.development_plans development_plan
    where development_plan.id = new.plan_id;

    if v_new_plan_status is null then
      raise exception using
        errcode = 'P0002',
        message =
          'DEVELOPMENT_PLAN_NOT_FOUND';
    end if;

    if v_new_plan_status in (
      'completed',
      'cancelled'
    ) then
      raise exception using
        errcode = '55000',
        message =
          'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all
on function
public.protect_closed_development_plan_goals()
from public;

drop trigger if exists
protect_closed_development_plan_goals_trigger
on public.development_goals;

create trigger
protect_closed_development_plan_goals_trigger
before insert or update or delete
on public.development_goals
for each row
execute function
public.protect_closed_development_plan_goals();

-- =====================================================
-- Development Actions protection
-- =====================================================

create or replace function
public.protect_closed_development_plan_actions()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_plan_status text;
  v_new_plan_status text;
begin
  -- ---------------------------------------------------
  -- Validate the current parent Plan for UPDATE/DELETE
  -- ---------------------------------------------------

  if tg_op in ('UPDATE', 'DELETE') then
    select
      development_plan.status
    into
      v_old_plan_status
    from public.development_goals development_goal
    join public.development_plans development_plan
      on development_plan.id =
        development_goal.plan_id
    where development_goal.id = old.goal_id;

    if v_old_plan_status in (
      'completed',
      'cancelled'
    ) then
      raise exception using
        errcode = '55000',
        message =
          'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY';
    end if;
  end if;

  -- ---------------------------------------------------
  -- Validate the target parent Plan for INSERT/UPDATE
  -- ---------------------------------------------------

  if tg_op in ('INSERT', 'UPDATE') then
    select
      development_plan.status
    into
      v_new_plan_status
    from public.development_goals development_goal
    join public.development_plans development_plan
      on development_plan.id =
        development_goal.plan_id
    where development_goal.id = new.goal_id;

    if v_new_plan_status is null then
      raise exception using
        errcode = 'P0002',
        message =
          'DEVELOPMENT_GOAL_OR_PLAN_NOT_FOUND';
    end if;

    if v_new_plan_status in (
      'completed',
      'cancelled'
    ) then
      raise exception using
        errcode = '55000',
        message =
          'CLOSED_DEVELOPMENT_PLAN_IS_READ_ONLY';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all
on function
public.protect_closed_development_plan_actions()
from public;

drop trigger if exists
protect_closed_development_plan_actions_trigger
on public.development_actions;

create trigger
protect_closed_development_plan_actions_trigger
before insert or update or delete
on public.development_actions
for each row
execute function
public.protect_closed_development_plan_actions();

comment on function
public.protect_closed_development_plan_goals()
is
  'Prevents Goal mutations when the related Development Plan is completed or cancelled.';

comment on function
public.protect_closed_development_plan_actions()
is
  'Prevents Action mutations when the related Development Plan is completed or cancelled.';