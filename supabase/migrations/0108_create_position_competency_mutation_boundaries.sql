-- Position Competency trusted mutations.
--
-- The authenticated application previously attempted direct protected DML on
-- position_competencies. RLS policies existed, but authenticated intentionally
-- has no table DML grants. These additive SECURITY DEFINER boundaries preserve
-- that closed-table contract while authorizing owner/admin/hr through the
-- established 0089 helper and recording Activity in the same transaction.

-- Legacy Supabase projects may have inherited broad default table privileges,
-- including GRANT ALL to anon/authenticated. Make the trusted-only mutation
-- contract explicit and environment-independent. SELECT/REFERENCES are left
-- untouched so existing RLS-governed read compatibility is preserved; direct
-- writes and table-level operational mutation remain closed.
revoke insert, update, delete, truncate, trigger, maintain
  on table public.position_competencies from anon, authenticated;

create or replace function public.create_tenant_position_competency_v1(
  p_company_id uuid,
  p_position_id uuid,
  p_competency_id uuid,
  p_expected_level integer,
  p_weight integer,
  p_required boolean,
  p_type text,
  p_notes text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_notes text := nullif(btrim(p_notes), '');
  v_position_name text;
  v_competency_name text;
begin
  perform public.require_people_organization_mutator(p_company_id);

  if p_expected_level is null or p_expected_level not between 1 and 5
    or p_weight is null or p_weight not between 1 and 5
    or p_required is null
    or p_type is null or p_type not in ('core','leadership','promotion','optional')
    or (v_notes is not null and char_length(v_notes) > 500)
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  select name into v_position_name from public.positions
  where id = p_position_id and company_id = p_company_id and deleted_at is null;
  if not found then
    raise exception using errcode = 'P0002', message = 'POSITION_NOT_FOUND';
  end if;

  select name into v_competency_name from public.competencies
  where id = p_competency_id and company_id = p_company_id and active = true;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPETENCY_NOT_FOUND';
  end if;

  begin
    insert into public.position_competencies (
      company_id, position_id, competency_id, expected_level, weight,
      required, type, notes
    ) values (
      p_company_id, p_position_id, p_competency_id, p_expected_level, p_weight,
      p_required, p_type, v_notes
    ) returning id into v_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  perform public.append_people_organization_activity(
    p_company_id, 'position_competency.created', 'competencies',
    'Competência esperada adicionada',
    'A competência ' || v_competency_name || ' foi adicionada ao cargo ' || v_position_name || '.',
    'position_competency', v_id, 'position', p_position_id,
    jsonb_build_object(
      'positionCompetencyId', v_id, 'positionId', p_position_id,
      'competencyId', p_competency_id, 'expectedLevel', p_expected_level,
      'weight', p_weight, 'required', p_required, 'type', p_type
    )
  );

  return jsonb_build_object('status', 'succeeded', 'positionCompetencyId', v_id);
end;
$$;

create or replace function public.update_tenant_position_competency_v1(
  p_company_id uuid,
  p_position_competency_id uuid,
  p_position_id uuid,
  p_competency_id uuid,
  p_expected_level integer,
  p_weight integer,
  p_required boolean,
  p_type text,
  p_notes text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.position_competencies%rowtype;
  v_notes text := nullif(btrim(p_notes), '');
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current from public.position_competencies
  where id = p_position_competency_id and company_id = p_company_id
    and archived_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'POSITION_COMPETENCY_NOT_FOUND';
  end if;

  if p_expected_level is null or p_expected_level not between 1 and 5
    or p_weight is null or p_weight not between 1 and 5
    or p_required is null
    or p_type is null or p_type not in ('core','leadership','promotion','optional')
    or (v_notes is not null and char_length(v_notes) > 500)
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  -- A Position Competency's endpoints are immutable after creation. The current
  -- form sends them back as selectors, but update may only change expectation
  -- fields; relinking is archive + create.
  if p_position_id <> v_current.position_id
    or p_competency_id <> v_current.competency_id
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  if not exists (
    select 1 from public.positions
    where id = p_position_id and company_id = p_company_id and deleted_at is null
  ) then
    raise exception using errcode = 'P0002', message = 'POSITION_NOT_FOUND';
  end if;
  if not exists (
    select 1 from public.competencies
    where id = p_competency_id and company_id = p_company_id and active = true
  ) then
    raise exception using errcode = 'P0002', message = 'COMPETENCY_NOT_FOUND';
  end if;

  begin
    update public.position_competencies set
      expected_level = p_expected_level,
      weight = p_weight,
      required = p_required,
      type = p_type,
      notes = v_notes,
      updated_at = now()
    where id = p_position_competency_id and company_id = p_company_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  perform public.append_people_organization_activity(
    p_company_id, 'position_competency.updated', 'competencies',
    'Competência esperada atualizada',
    'Uma competência esperada do cargo foi atualizada.',
    'position_competency', p_position_competency_id, 'position', p_position_id,
    jsonb_build_object(
      'positionCompetencyId', p_position_competency_id,
      'positionId', p_position_id, 'competencyId', p_competency_id,
      'expectedLevel', p_expected_level, 'weight', p_weight,
      'required', p_required, 'type', p_type
    )
  );

  return jsonb_build_object(
    'status', 'succeeded', 'positionCompetencyId', p_position_competency_id
  );
end;
$$;

create or replace function public.archive_tenant_position_competency_v1(
  p_company_id uuid,
  p_position_competency_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_current public.position_competencies%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current from public.position_competencies
  where id = p_position_competency_id and company_id = p_company_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'POSITION_COMPETENCY_NOT_FOUND';
  end if;
  if v_current.archived_at is not null then
    return jsonb_build_object(
      'status', 'already_archived', 'positionCompetencyId', p_position_competency_id
    );
  end if;

  update public.position_competencies
  set archived_at = now(), updated_at = now()
  where id = p_position_competency_id and company_id = p_company_id;

  perform public.append_people_organization_activity(
    p_company_id, 'position_competency.archived', 'competencies',
    'Competência esperada removida',
    'Uma competência esperada foi removida do cargo.',
    'position_competency', p_position_competency_id, 'position', v_current.position_id,
    jsonb_build_object(
      'positionCompetencyId', p_position_competency_id,
      'positionId', v_current.position_id, 'competencyId', v_current.competency_id
    )
  );

  return jsonb_build_object(
    'status', 'succeeded', 'positionCompetencyId', p_position_competency_id
  );
end;
$$;

revoke all on function public.create_tenant_position_competency_v1(
  uuid, uuid, uuid, integer, integer, boolean, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.update_tenant_position_competency_v1(
  uuid, uuid, uuid, uuid, integer, integer, boolean, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_position_competency_v1(uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.create_tenant_position_competency_v1(
  uuid, uuid, uuid, integer, integer, boolean, text, text
), public.update_tenant_position_competency_v1(
  uuid, uuid, uuid, uuid, integer, integer, boolean, text, text
), public.archive_tenant_position_competency_v1(uuid, uuid)
to authenticated;

notify pgrst, 'reload schema';
