-- =====================================================
-- Fix applied Development Plan defaults
-- =====================================================
--
-- Plans created from a Development Template must:
--
-- 1. start as active;
-- 2. always have a start date;
-- 3. use the Template suggested duration when the
--    user does not explicitly provide a plan due date;
-- 4. calculate Action due dates from the resolved
--    plan start date.
--
-- The original transactional function is preserved as
-- an internal implementation. The public RPC keeps the
-- same name and parameter contract used by the frontend.
-- =====================================================

alter function public.apply_development_template(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  date,
  date
)
rename to apply_development_template_transaction;

-- The internal implementation must not be callable
-- directly by authenticated API clients.

revoke all
on function public.apply_development_template_transaction(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  date,
  date
)
from public;

revoke execute
on function public.apply_development_template_transaction(
  uuid,
  uuid,
  uuid,
  text,
  uuid,
  date,
  date
)
from authenticated;

create function public.apply_development_template(
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
  v_start_date date;
  v_due_date date;
  v_suggested_duration_days integer;
  v_plan_id uuid;
begin
  -- ===================================================
  -- Resolve the effective start date
  -- ===================================================

  v_start_date := coalesce(
    p_start_date,
    current_date
  );

  -- ===================================================
  -- Read the Template suggested duration
  --
  -- The internal transaction will still perform all
  -- authorization and Template validity checks.
  -- ===================================================

  select
    template.suggested_duration_days
  into
    v_suggested_duration_days
  from public.development_templates template
  where template.id = p_template_id;

  -- ===================================================
  -- Resolve the effective plan due date
  --
  -- Priority:
  -- 1. date explicitly supplied by the user;
  -- 2. start date + Template suggested duration;
  -- 3. null when the Template has no duration.
  -- ===================================================

  v_due_date :=
    case
      when p_due_date is not null then
        p_due_date

      when v_suggested_duration_days is not null then
        v_start_date
        + v_suggested_duration_days

      else
        null
    end;

  -- ===================================================
  -- Run the original atomic transaction
  --
  -- Passing v_start_date ensures that copied Actions
  -- can calculate:
  --
  -- action due date =
  -- plan start date + suggested_due_days
  -- ===================================================

  v_plan_id :=
    public.apply_development_template_transaction(
      p_company_id,
      p_employee_id,
      p_template_id,
      p_priority,
      p_owner_id,
      v_start_date,
      v_due_date
    );

  -- ===================================================
  -- Applied plans are ready for execution
  -- ===================================================

  update public.development_plans
  set
    status = 'active',
    updated_at = now()
  where id = v_plan_id
    and company_id = p_company_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'CREATED_DEVELOPMENT_PLAN_NOT_FOUND';
  end if;

  return v_plan_id;
end;
$$;

-- =====================================================
-- Public RPC permissions
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
  'Atomically creates an active Development Plan from a Template, resolving plan and Action due dates.';