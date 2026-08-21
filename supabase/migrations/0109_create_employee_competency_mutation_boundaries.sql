-- Employee Competency trusted mutations.
--
-- Product users have no direct DML privileges on employee_competencies. These
-- narrow SECURITY DEFINER functions authorize the established People and
-- Organization mutator roles, enforce tenant references, and write Activity in
-- the same transaction as each relationship mutation.

revoke insert, update, delete, truncate, trigger, maintain
  on table public.employee_competencies from anon, authenticated;

create or replace function public.create_tenant_employee_competency_v1(
  p_company_id uuid,
  p_employee_id uuid,
  p_competency_id uuid,
  p_current_level integer,
  p_source text,
  p_validated_at timestamptz,
  p_notes text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_notes text := nullif(btrim(p_notes), '');
  v_employee_name text;
  v_competency_name text;
begin
  perform public.require_people_organization_mutator(p_company_id);

  if p_current_level is null or p_current_level not between 1 and 5
    or p_source is null or p_source not in ('manual','assessment','manager','self')
    or (v_notes is not null and char_length(v_notes) > 500)
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  select full_name into v_employee_name from public.people
  where id = p_employee_id and company_id = p_company_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'EMPLOYEE_NOT_FOUND';
  end if;

  select name into v_competency_name from public.competencies
  where id = p_competency_id and company_id = p_company_id and active = true;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPETENCY_NOT_FOUND';
  end if;

  begin
    insert into public.employee_competencies (
      company_id, employee_id, competency_id, current_level, source,
      validated_at, notes
    ) values (
      p_company_id, p_employee_id, p_competency_id, p_current_level, p_source,
      p_validated_at, v_notes
    ) returning id into v_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  perform public.append_people_organization_activity(
    p_company_id, 'employee_competency.created', 'competencies',
    'Competência do colaborador adicionada',
    'A competência ' || v_competency_name || ' foi adicionada ao perfil de ' || v_employee_name || '.',
    'employee_competency', v_id, 'employee', p_employee_id,
    jsonb_build_object(
      'employeeCompetencyId', v_id, 'employeeId', p_employee_id,
      'competencyId', p_competency_id, 'currentLevel', p_current_level,
      'source', p_source, 'validatedAt', p_validated_at
    )
  );

  return jsonb_build_object('status', 'succeeded', 'employeeCompetencyId', v_id);
end;
$$;

create or replace function public.update_tenant_employee_competency_v1(
  p_company_id uuid,
  p_employee_competency_id uuid,
  p_employee_id uuid,
  p_competency_id uuid,
  p_current_level integer,
  p_source text,
  p_validated_at timestamptz,
  p_notes text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.employee_competencies%rowtype;
  v_notes text := nullif(btrim(p_notes), '');
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current from public.employee_competencies
  where id = p_employee_competency_id and company_id = p_company_id
    and archived_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'EMPLOYEE_COMPETENCY_NOT_FOUND';
  end if;

  if p_current_level is null or p_current_level not between 1 and 5
    or p_source is null or p_source not in ('manual','assessment','manager','self')
    or (v_notes is not null and char_length(v_notes) > 500)
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  if p_employee_id <> v_current.employee_id
    or p_competency_id <> v_current.competency_id
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  if not exists (
    select 1 from public.people
    where id = p_employee_id and company_id = p_company_id
  ) then
    raise exception using errcode = 'P0002', message = 'EMPLOYEE_NOT_FOUND';
  end if;
  if not exists (
    select 1 from public.competencies
    where id = p_competency_id and company_id = p_company_id and active = true
  ) then
    raise exception using errcode = 'P0002', message = 'COMPETENCY_NOT_FOUND';
  end if;

  update public.employee_competencies set
    current_level = p_current_level,
    source = p_source,
    validated_at = p_validated_at,
    notes = v_notes,
    updated_at = now()
  where id = p_employee_competency_id and company_id = p_company_id;

  perform public.append_people_organization_activity(
    p_company_id, 'employee_competency.updated', 'competencies',
    'Competência do colaborador atualizada',
    'Uma competência registrada no perfil do colaborador foi atualizada.',
    'employee_competency', p_employee_competency_id, 'employee', p_employee_id,
    jsonb_build_object(
      'employeeCompetencyId', p_employee_competency_id,
      'employeeId', p_employee_id, 'competencyId', p_competency_id,
      'currentLevel', p_current_level, 'source', p_source,
      'validatedAt', p_validated_at
    )
  );

  return jsonb_build_object(
    'status', 'succeeded', 'employeeCompetencyId', p_employee_competency_id
  );
end;
$$;

create or replace function public.archive_tenant_employee_competency_v1(
  p_company_id uuid,
  p_employee_competency_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_current public.employee_competencies%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current from public.employee_competencies
  where id = p_employee_competency_id and company_id = p_company_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'EMPLOYEE_COMPETENCY_NOT_FOUND';
  end if;
  if v_current.archived_at is not null then
    return jsonb_build_object(
      'status', 'already_archived', 'employeeCompetencyId', p_employee_competency_id
    );
  end if;

  update public.employee_competencies
  set archived_at = now(), updated_at = now()
  where id = p_employee_competency_id and company_id = p_company_id;

  perform public.append_people_organization_activity(
    p_company_id, 'employee_competency.archived', 'competencies',
    'Competência do colaborador removida',
    'Uma competência registrada foi removida do perfil do colaborador.',
    'employee_competency', p_employee_competency_id, 'employee', v_current.employee_id,
    jsonb_build_object(
      'employeeCompetencyId', p_employee_competency_id,
      'employeeId', v_current.employee_id,
      'competencyId', v_current.competency_id
    )
  );

  return jsonb_build_object(
    'status', 'succeeded', 'employeeCompetencyId', p_employee_competency_id
  );
end;
$$;

revoke all on function public.create_tenant_employee_competency_v1(
  uuid, uuid, uuid, integer, text, timestamptz, text
) from public, anon, authenticated, service_role;
revoke all on function public.update_tenant_employee_competency_v1(
  uuid, uuid, uuid, uuid, integer, text, timestamptz, text
) from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_employee_competency_v1(uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.create_tenant_employee_competency_v1(
  uuid, uuid, uuid, integer, text, timestamptz, text
), public.update_tenant_employee_competency_v1(
  uuid, uuid, uuid, uuid, integer, text, timestamptz, text
), public.archive_tenant_employee_competency_v1(uuid, uuid)
to authenticated;

notify pgrst, 'reload schema';
