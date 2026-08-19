-- MVP Closure: Recruitment job-opening trusted write boundary (Phase 1 of the
-- functional vacancy flow).
--
-- recruitment_job_openings has RLS policies but no direct grant for
-- `authenticated`, so the application's direct INSERT fails 42501. Mirroring the
-- 0089 People/Organization mutation boundaries, this additive SECURITY DEFINER
-- RPC creates a job opening as a draft: it authorizes an active owner/admin/hr
-- actor, validates every tenant-owned foreign reference inside the transaction,
-- records the creation activity atomically, is idempotent, and returns the new
-- row as jsonb. No table grants; execute is granted only to authenticated.
--
-- Reaching `open` still requires the existing approval chain
-- (draft -> pending_approval -> approved -> open); this boundary only creates the
-- draft. Status transitions get their own trusted boundary in a later phase.

create or replace function public.create_tenant_job_opening_v1(
  p_company_id uuid,
  p_title text,
  p_description text,
  p_department_id uuid,
  p_position_id uuid,
  p_requesting_manager_id uuid,
  p_recruiter_id uuid,
  p_opening_reason text,
  p_replaced_employee_id uuid,
  p_opening_justification text,
  p_positions_count integer,
  p_current_headcount integer,
  p_target_headcount integer,
  p_work_model text,
  p_location text,
  p_employment_type text,
  p_salary_min numeric,
  p_salary_max numeric,
  p_priority text,
  p_target_hire_date date,
  p_notes text,
  p_estimated_monthly_cost numeric,
  p_is_budgeted boolean,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_title text := btrim(p_title);
  v_description text := btrim(p_description);
  v_justification text := btrim(p_opening_justification);
  v_location text := nullif(btrim(p_location), '');
  v_notes text := nullif(btrim(p_notes), '');
  v_key text := 'recruitment:job-opening:create:' || btrim(coalesce(p_idempotency_key, ''));
  v_job_opening_id uuid;
  v_existing public.activity_events%rowtype;
  v_row public.recruitment_job_openings%rowtype;
begin
  -- Shared management-mutator authorization (active owner/admin/hr).
  v_actor := public.require_people_organization_mutator(p_company_id);

  -- Input validation (mirrors the create schema; fail closed).
  if v_title is null or char_length(v_title) < 1 or char_length(v_title) > 160
    or v_description is null or char_length(v_description) < 1
    or v_justification is null or char_length(v_justification) < 1
    or nullif(btrim(coalesce(p_idempotency_key, '')), '') is null
    or char_length(btrim(p_idempotency_key)) > 200
    or p_positions_count is null or p_positions_count < 1
    or p_current_headcount is null or p_current_headcount < 0
    or p_target_headcount is null or p_target_headcount < 0
    or p_opening_reason not in ('replacement','headcount_growth','new_position','temporary_demand','internal_mobility','other')
    or p_work_model not in ('on_site','hybrid','remote')
    or p_employment_type not in ('clt','pj','intern','apprentice','temporary','outsourced','contractor','other')
    or p_priority not in ('low','medium','high','urgent')
    or p_is_budgeted is null
    or (p_salary_min is not null and p_salary_min < 0)
    or (p_salary_max is not null and p_salary_max < 0)
    or (p_salary_min is not null and p_salary_max is not null and p_salary_max < p_salary_min)
    or (p_estimated_monthly_cost is not null and p_estimated_monthly_cost < 0)
  then
    raise exception using errcode = '22023', message = 'JOB_OPENING_INPUT_INVALID';
  end if;

  -- Replacement rule: replaced_employee_id iff opening_reason = 'replacement'.
  if (p_opening_reason = 'replacement' and p_replaced_employee_id is null)
    or (p_opening_reason <> 'replacement' and p_replaced_employee_id is not null)
  then
    raise exception using errcode = '22023', message = 'JOB_OPENING_REPLACEMENT_INVALID';
  end if;

  -- Tenant-owned foreign references must all belong to the same company.
  if not exists (select 1 from public.departments d
    where d.id = p_department_id and d.company_id = p_company_id and d.deleted_at is null)
  then
    raise exception using errcode = '23503', message = 'JOB_OPENING_DEPARTMENT_INVALID';
  end if;

  if not exists (select 1 from public.positions pos
    where pos.id = p_position_id and pos.company_id = p_company_id)
  then
    raise exception using errcode = '23503', message = 'JOB_OPENING_POSITION_INVALID';
  end if;

  if not exists (select 1 from public.people pe
    where pe.id = p_requesting_manager_id and pe.company_id = p_company_id)
  then
    raise exception using errcode = '23503', message = 'JOB_OPENING_MANAGER_INVALID';
  end if;

  if p_recruiter_id is not null and not exists (select 1 from public.people pe
    where pe.id = p_recruiter_id and pe.company_id = p_company_id)
  then
    raise exception using errcode = '23503', message = 'JOB_OPENING_RECRUITER_INVALID';
  end if;

  if p_replaced_employee_id is not null and not exists (select 1 from public.people pe
    where pe.id = p_replaced_employee_id and pe.company_id = p_company_id)
  then
    raise exception using errcode = '23503', message = 'JOB_OPENING_REPLACED_INVALID';
  end if;

  -- Idempotency via the canonical activity_events.idempotency_key column
  -- (unique per company, migration 0047): a repeated create with the same key
  -- returns the first result instead of inserting a duplicate.
  select * into v_existing from public.activity_events e
    where e.company_id = p_company_id
      and e.idempotency_key = v_key
    limit 1;

  if found then
    select * into v_row from public.recruitment_job_openings j
      where j.id = v_existing.entity_id
        and j.company_id = p_company_id;
    if found then
      return to_jsonb(v_row);
    end if;
  end if;

  insert into public.recruitment_job_openings (
    company_id, title, description, department_id, position_id,
    requesting_manager_id, recruiter_id, opening_reason, replaced_employee_id,
    opening_justification, positions_count, current_headcount, target_headcount,
    work_model, location, employment_type, salary_min, salary_max, status,
    priority, target_hire_date, approver_id, approved_at, notes,
    estimated_monthly_cost, is_budgeted, created_by_user_id
  ) values (
    p_company_id, v_title, v_description, p_department_id, p_position_id,
    p_requesting_manager_id, p_recruiter_id, p_opening_reason, p_replaced_employee_id,
    v_justification, p_positions_count, p_current_headcount, p_target_headcount,
    p_work_model, v_location, p_employment_type, p_salary_min, p_salary_max, 'draft',
    p_priority, p_target_hire_date, null, null, v_notes,
    p_estimated_monthly_cost, p_is_budgeted, v_actor
  )
  returning * into v_row;

  v_job_opening_id := v_row.id;

  insert into public.activity_events (
    company_id, activity_type, module, title, description, actor_type, actor_id,
    entity_type, entity_id, occurred_at, metadata, idempotency_key
  ) values (
    p_company_id, 'job_opening.created', 'recruitment', 'Vaga criada',
    'A vaga "' || v_title || '" foi criada.', 'user', v_actor,
    'job_opening', v_job_opening_id, now(),
    jsonb_build_object('job_opening_id', v_job_opening_id), v_key
  );

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.create_tenant_job_opening_v1(
  uuid, text, text, uuid, uuid, uuid, uuid, text, uuid, text, integer, integer,
  integer, text, text, text, numeric, numeric, text, date, text, numeric, boolean, text
) from public, anon, authenticated, service_role;
grant execute on function public.create_tenant_job_opening_v1(
  uuid, text, text, uuid, uuid, uuid, uuid, text, uuid, text, integer, integer,
  integer, text, text, text, numeric, numeric, text, date, text, numeric, boolean, text
) to authenticated;

notify pgrst, 'reload schema';
