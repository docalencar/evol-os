-- MVP Closure — Competency Catalog core trusted mutations (P0).
--
-- The competency catalog (public.competencies) create/update/archive still ran as
-- direct protected DML (competency-repository.ts: .from("competencies").insert/
-- .update), which fails 42501 because `authenticated` has the owner/admin/hr
-- mutation POLICY but no table GRANT. This is the last P0 write blocking the
-- authenticated core smoke / Human Review foundation (org and people are already
-- closed by 0089).
--
-- DB-first only: app consumers remain unchanged until the integration PR. Three
-- additive SECURITY DEFINER boundaries reuse the established 0089 pattern and its
-- generic helpers (require_people_organization_mutator = owner/admin/hr gate with
-- actor from auth.uid(); append_people_organization_activity = atomic activity).
--
-- Archive semantics are proven by the schema: competencies has NO deleted_at; the
-- soft archive flips `active = false` (the same column the unique index and the
-- app repository use). Assignments (employee/position competencies) are NOT
-- touched: an archived catalog entry stays historical.
--
-- No table grants; no RLS/policy changes; hardened search_path; tenant scoped;
-- EXECUTE granted only to authenticated.

-- Create -----------------------------------------------------------------------
create or replace function public.create_tenant_competency_v1(
  p_company_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_expected_level integer,
  p_weight integer,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_id uuid;
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
  v_key text := 'catalog:competency:create:' || btrim(coalesce(p_idempotency_key, ''));
  v_fingerprint text;
  v_existing public.activity_events%rowtype;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);

  if v_name is null or char_length(v_name) not between 2 and 120
    or (v_description is not null and char_length(v_description) > 500)
    or p_category is null or p_category not in ('behavioral', 'technical', 'leadership')
    or p_expected_level is null or p_expected_level not between 1 and 5
    or p_weight is null or p_weight not between 1 and 5
    or nullif(btrim(coalesce(p_idempotency_key, '')), '') is null
    or char_length(btrim(p_idempotency_key)) > 200
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  v_fingerprint := encode(extensions.digest(jsonb_build_object(
    'name', v_name, 'description', v_description, 'category', p_category,
    'expectedLevel', p_expected_level, 'weight', p_weight
  )::text, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(
    p_company_id::text || ':' || v_actor::text || ':' || v_key, 0
  ));
  select * into v_existing from public.activity_events
  where company_id = p_company_id and idempotency_key = v_key;
  if found then
    if v_existing.activity_type <> 'competency.created'
      or v_existing.metadata ->> 'intentFingerprint' <> v_fingerprint
    then raise exception using errcode = '23505', message = 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('status', 'idempotent_retry', 'competencyId', v_existing.entity_id);
  end if;

  begin
    insert into public.competencies (
      company_id, name, description, category, expected_level, weight, active
    ) values (
      p_company_id, v_name, v_description, p_category, p_expected_level, p_weight, true
    ) returning id into v_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  perform public.append_people_organization_activity(
    p_company_id, 'competency.created', 'competencies', 'Competência criada',
    'A competência ' || v_name || ' foi criada.', 'competency', v_id,
    null, null,
    jsonb_build_object(
      'competencyId', v_id, 'competencyName', v_name, 'category', p_category,
      'expectedLevel', p_expected_level, 'weight', p_weight,
      'intentFingerprint', v_fingerprint
    ), v_key
  );
  return jsonb_build_object('status', 'succeeded', 'competencyId', v_id);
end;
$$;

-- Update -----------------------------------------------------------------------
create or replace function public.update_tenant_competency_v1(
  p_company_id uuid,
  p_competency_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_expected_level integer,
  p_weight integer
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.competencies%rowtype;
  v_name text := btrim(p_name);
  v_description text := nullif(btrim(p_description), '');
begin
  perform public.require_people_organization_mutator(p_company_id);

  -- Editing targets an ACTIVE catalog entry; archive is the dedicated op.
  select * into v_current from public.competencies
  where id = p_competency_id and company_id = p_company_id and active = true
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPETENCY_NOT_FOUND';
  end if;

  if v_name is null or char_length(v_name) not between 2 and 120
    or (v_description is not null and char_length(v_description) > 500)
    or p_category is null or p_category not in ('behavioral', 'technical', 'leadership')
    or p_expected_level is null or p_expected_level not between 1 and 5
    or p_weight is null or p_weight not between 1 and 5
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  begin
    update public.competencies set
      name = v_name, description = v_description, category = p_category,
      expected_level = p_expected_level, weight = p_weight, updated_at = now()
    where id = p_competency_id and company_id = p_company_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  perform public.append_people_organization_activity(
    p_company_id, 'competency.updated', 'competencies', 'Competência atualizada',
    'A competência ' || v_name || ' foi atualizada.', 'competency', p_competency_id,
    null, null, jsonb_build_object(
      'competencyId', p_competency_id, 'competencyName', v_name,
      'previousCompetencyName', v_current.name, 'category', p_category,
      'expectedLevel', p_expected_level, 'weight', p_weight
    )
  );
  return jsonb_build_object('status', 'succeeded', 'competencyId', p_competency_id);
end;
$$;

-- Archive (soft, via active = false) -------------------------------------------
create or replace function public.archive_tenant_competency_v1(
  p_company_id uuid,
  p_competency_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_current public.competencies%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current from public.competencies
  where id = p_competency_id and company_id = p_company_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'COMPETENCY_NOT_FOUND';
  end if;
  if v_current.active = false then
    return jsonb_build_object('status', 'already_archived', 'competencyId', p_competency_id);
  end if;

  -- Soft archive only. Assignments (employee/position competencies) are NOT
  -- mutated; the catalog record stays historical.
  update public.competencies set active = false, updated_at = now()
  where id = p_competency_id and company_id = p_company_id;

  perform public.append_people_organization_activity(
    p_company_id, 'competency.archived', 'competencies', 'Competência arquivada',
    'A competência ' || v_current.name || ' foi arquivada.',
    'competency', p_competency_id, null, null,
    jsonb_build_object('competencyId', p_competency_id, 'competencyName', v_current.name)
  );
  return jsonb_build_object('status', 'succeeded', 'competencyId', p_competency_id);
end;
$$;

revoke all on function public.create_tenant_competency_v1(uuid, text, text, text, integer, integer, text)
  from public, anon, authenticated, service_role;
revoke all on function public.update_tenant_competency_v1(uuid, uuid, text, text, text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_competency_v1(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.create_tenant_competency_v1(uuid, text, text, text, integer, integer, text),
  public.update_tenant_competency_v1(uuid, uuid, text, text, text, integer, integer),
  public.archive_tenant_competency_v1(uuid, uuid)
  to authenticated;

notify pgrst, 'reload schema';
