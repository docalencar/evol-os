-- Trusted Assessment Template and Section mutations.
--
-- The legacy schema permits global templates (company_id is null), while
-- sections are tenant-owned. A composite FK would make that historical model
-- incompatible, so tenant integrity is enforced authoritatively by these RPCs.

revoke insert, update, delete, truncate, trigger, maintain
  on table public.assessment_templates, public.assessment_sections
  from public, anon, authenticated;

create or replace function public.create_tenant_assessment_template_v1(
  p_company_id uuid,
  p_name text,
  p_description text,
  p_instructions text,
  p_type text,
  p_status text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
  v_instructions text := nullif(btrim(p_instructions), '');
begin
  perform public.require_people_organization_mutator(p_company_id);

  if v_name is null or char_length(v_name) not between 2 and 120
    or (v_description is not null and char_length(v_description) > 500)
    or (v_instructions is not null and char_length(v_instructions) > 2000)
    or p_type not in (
      'experience', 'monthly', 'quarterly', 'semester', 'annual', '360',
      'leadership'
    )
    or p_status not in ('draft', 'active', 'archived')
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  insert into public.assessment_templates (
    company_id, name, description, instructions, type, status, active
  ) values (
    p_company_id, v_name, v_description, v_instructions, p_type, p_status,
    p_status = 'active'
  ) returning id into v_id;

  return jsonb_build_object(
    'status', 'succeeded', 'assessmentTemplateId', v_id
  );
end;
$$;

create or replace function public.update_tenant_assessment_template_v1(
  p_company_id uuid,
  p_assessment_template_id uuid,
  p_name text,
  p_description text,
  p_instructions text,
  p_type text,
  p_status text
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.assessment_templates%rowtype;
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
  v_instructions text := nullif(btrim(p_instructions), '');
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current
  from public.assessment_templates
  where id = p_assessment_template_id
    and company_id = p_company_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'P0002', message = 'ASSESSMENT_TEMPLATE_NOT_FOUND';
  end if;

  if v_name is null or char_length(v_name) not between 2 and 120
    or (v_description is not null and char_length(v_description) > 500)
    or (v_instructions is not null and char_length(v_instructions) > 2000)
    or p_type not in (
      'experience', 'monthly', 'quarterly', 'semester', 'annual', '360',
      'leadership'
    )
    or p_status not in ('draft', 'active', 'archived')
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  update public.assessment_templates
  set name = v_name,
      description = v_description,
      instructions = v_instructions,
      type = p_type,
      status = p_status,
      active = p_status = 'active',
      updated_at = now()
  where id = p_assessment_template_id and company_id = p_company_id;

  return jsonb_build_object(
    'status', 'succeeded',
    'assessmentTemplateId', p_assessment_template_id
  );
end;
$$;

create or replace function public.archive_tenant_assessment_template_v1(
  p_company_id uuid,
  p_assessment_template_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.assessment_templates%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current
  from public.assessment_templates
  where id = p_assessment_template_id and company_id = p_company_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002', message = 'ASSESSMENT_TEMPLATE_NOT_FOUND';
  end if;

  if v_current.deleted_at is not null then
    return jsonb_build_object(
      'status', 'already_archived',
      'assessmentTemplateId', p_assessment_template_id
    );
  end if;

  update public.assessment_templates
  set status = 'archived', active = false,
      deleted_at = now(), updated_at = now()
  where id = p_assessment_template_id and company_id = p_company_id;

  return jsonb_build_object(
    'status', 'succeeded',
    'assessmentTemplateId', p_assessment_template_id
  );
end;
$$;

create or replace function public.create_tenant_assessment_section_v1(
  p_company_id uuid,
  p_assessment_template_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_icon text,
  p_color text,
  p_weight numeric,
  p_display_order integer,
  p_active boolean
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_code text := upper(nullif(btrim(p_code), ''));
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
  v_icon text := nullif(btrim(p_icon), '');
  v_color text := nullif(btrim(p_color), '');
begin
  perform public.require_people_organization_mutator(p_company_id);

  if v_name is null or char_length(v_name) not between 2 and 120
    or (v_code is not null and char_length(v_code) > 30)
    or (v_description is not null and char_length(v_description) > 500)
    or (v_icon is not null and char_length(v_icon) > 50)
    or (v_color is not null and char_length(v_color) > 30)
    or p_weight is null or p_weight <= 0 or p_weight > 100
    or p_display_order is null or p_display_order < 0
    or p_active is null
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  if not exists (
    select 1 from public.assessment_templates
    where id = p_assessment_template_id
      and company_id = p_company_id
      and deleted_at is null
      and status <> 'archived'
  ) then
    raise exception using
      errcode = 'P0002', message = 'ASSESSMENT_TEMPLATE_NOT_FOUND';
  end if;

  begin
    insert into public.assessment_sections (
      company_id, assessment_template_id, code, name, description, icon,
      color, weight, display_order, active
    ) values (
      p_company_id, p_assessment_template_id, v_code, v_name, v_description,
      v_icon, v_color, p_weight, p_display_order, p_active
    ) returning id into v_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  return jsonb_build_object(
    'status', 'succeeded', 'assessmentSectionId', v_id,
    'assessmentTemplateId', p_assessment_template_id
  );
end;
$$;

create or replace function public.update_tenant_assessment_section_v1(
  p_company_id uuid,
  p_assessment_section_id uuid,
  p_assessment_template_id uuid,
  p_code text,
  p_name text,
  p_description text,
  p_icon text,
  p_color text,
  p_weight numeric,
  p_display_order integer,
  p_active boolean
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.assessment_sections%rowtype;
  v_code text := upper(nullif(btrim(p_code), ''));
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
  v_icon text := nullif(btrim(p_icon), '');
  v_color text := nullif(btrim(p_color), '');
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current
  from public.assessment_sections
  where id = p_assessment_section_id
    and company_id = p_company_id
    and deleted_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'P0002', message = 'ASSESSMENT_SECTION_NOT_FOUND';
  end if;

  if p_assessment_template_id is distinct from
      v_current.assessment_template_id
  then
    raise exception using
      errcode = '23514', message = 'ASSESSMENT_SECTION_TEMPLATE_IMMUTABLE';
  end if;

  if not exists (
    select 1 from public.assessment_templates
    where id = p_assessment_template_id
      and company_id = p_company_id
      and deleted_at is null
      and status <> 'archived'
  ) then
    raise exception using
      errcode = 'P0002', message = 'ASSESSMENT_TEMPLATE_NOT_FOUND';
  end if;

  if v_name is null or char_length(v_name) not between 2 and 120
    or (v_code is not null and char_length(v_code) > 30)
    or (v_description is not null and char_length(v_description) > 500)
    or (v_icon is not null and char_length(v_icon) > 50)
    or (v_color is not null and char_length(v_color) > 30)
    or p_weight is null or p_weight <= 0 or p_weight > 100
    or p_display_order is null or p_display_order < 0
    or p_active is null
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  begin
    update public.assessment_sections
    set code = v_code,
        name = v_name,
        description = v_description,
        icon = v_icon,
        color = v_color,
        weight = p_weight,
        display_order = p_display_order,
        active = p_active,
        updated_at = now()
    where id = p_assessment_section_id and company_id = p_company_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  return jsonb_build_object(
    'status', 'succeeded',
    'assessmentSectionId', p_assessment_section_id,
    'assessmentTemplateId', p_assessment_template_id
  );
end;
$$;

create or replace function public.archive_tenant_assessment_section_v1(
  p_company_id uuid,
  p_assessment_section_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.assessment_sections%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current
  from public.assessment_sections
  where id = p_assessment_section_id and company_id = p_company_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002', message = 'ASSESSMENT_SECTION_NOT_FOUND';
  end if;

  if v_current.deleted_at is not null then
    return jsonb_build_object(
      'status', 'already_archived',
      'assessmentSectionId', p_assessment_section_id,
      'assessmentTemplateId', v_current.assessment_template_id
    );
  end if;

  update public.assessment_sections
  set active = false, deleted_at = now(), updated_at = now()
  where id = p_assessment_section_id and company_id = p_company_id;

  return jsonb_build_object(
    'status', 'succeeded',
    'assessmentSectionId', p_assessment_section_id,
    'assessmentTemplateId', v_current.assessment_template_id
  );
end;
$$;

revoke all on function public.create_tenant_assessment_template_v1(
  uuid, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.update_tenant_assessment_template_v1(
  uuid, uuid, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_assessment_template_v1(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.create_tenant_assessment_section_v1(
  uuid, uuid, text, text, text, text, text, numeric, integer, boolean
) from public, anon, authenticated, service_role;
revoke all on function public.update_tenant_assessment_section_v1(
  uuid, uuid, uuid, text, text, text, text, text, numeric, integer, boolean
) from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_assessment_section_v1(uuid, uuid)
  from public, anon, authenticated, service_role;

grant execute on function public.create_tenant_assessment_template_v1(
  uuid, text, text, text, text, text
), public.update_tenant_assessment_template_v1(
  uuid, uuid, text, text, text, text, text
), public.archive_tenant_assessment_template_v1(
  uuid, uuid
), public.create_tenant_assessment_section_v1(
  uuid, uuid, text, text, text, text, text, numeric, integer, boolean
), public.update_tenant_assessment_section_v1(
  uuid, uuid, uuid, text, text, text, text, text, numeric, integer, boolean
), public.archive_tenant_assessment_section_v1(uuid, uuid)
to authenticated;

notify pgrst, 'reload schema';
