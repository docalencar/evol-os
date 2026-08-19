-- Career / Seniority + Position Taxonomy — Slice 1A: Seniority Catalog Foundation.
--
-- PD-021 (Approved) + ADR-0017 (Accepted). DB-first, DB-only: no UI/app wiring.
-- Introduces the company-owned `seniority_levels` catalog (configurable, ordered,
-- archiveable, optional) and its trusted create/update/archive boundaries. There is
-- NO required seed — a company may have zero seniority levels.
--
-- This slice does NOT introduce position_seniority_profiles, People assignment,
-- competency matrix or Recruitment. Archive therefore does not check usage by any
-- position (profiles do not exist yet — that rule arrives in Slice 2A/2B).
--
-- Reuses the established boundary helpers require_people_organization_mutator
-- (owner/admin/hr gate, actor from auth.uid()) and append_people_organization_activity
-- (atomic activity). Composite tenant-safe key per ADR-0012; RLS enabled with the
-- standard tenant policies; NO table grants; hardened search_path; EXECUTE only to
-- authenticated (ADR-0013).

-- Table -----------------------------------------------------------------------
create table if not exists public.seniority_levels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  label text not null,
  rank integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seniority_levels_code_check
    check (char_length(btrim(code)) between 1 and 40),
  constraint seniority_levels_label_check
    check (char_length(btrim(label)) between 1 and 80),
  constraint seniority_levels_rank_check check (rank >= 0),
  -- Composite tenant-safe key so future FKs (position_seniority_profiles) can
  -- reference (id, company_id) per ADR-0012.
  constraint seniority_levels_id_company_id_key unique (id, company_id)
);

-- One active level per code within a tenant; archived codes are re-creatable.
-- rank is intentionally NOT unique (ordering only; no forced continuity).
create unique index if not exists seniority_levels_company_code_active_unique
  on public.seniority_levels (company_id, lower(code))
  where active;

create index if not exists seniority_levels_company_rank_idx
  on public.seniority_levels (company_id, rank);

-- RLS: defense-in-depth, standard tenant policies. No table grants are issued, so
-- direct access remains closed; all writes go through the boundaries below and
-- reads will be served by a read boundary in Slice 1B.
alter table public.seniority_levels enable row level security;

create policy "members can read seniority levels"
  on public.seniority_levels for select
  using (public.is_company_member(company_id));

create policy "admins and hr manage seniority levels"
  on public.seniority_levels for all
  using (public.has_company_role(company_id, array['owner','admin','hr']));

-- Create ----------------------------------------------------------------------
create or replace function public.create_tenant_seniority_level_v1(
  p_company_id uuid,
  p_code text,
  p_label text,
  p_rank integer,
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
  v_code text := btrim(p_code);
  v_label text := btrim(p_label);
  v_key text := 'catalog:seniority:create:' || btrim(coalesce(p_idempotency_key, ''));
  v_fingerprint text;
  v_existing public.activity_events%rowtype;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);

  if v_code is null or char_length(v_code) not between 1 and 40
    or v_label is null or char_length(v_label) not between 1 and 80
    or p_rank is null or p_rank < 0
    or nullif(btrim(coalesce(p_idempotency_key, '')), '') is null
    or char_length(btrim(p_idempotency_key)) > 200
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  v_fingerprint := encode(extensions.digest(jsonb_build_object(
    'code', lower(v_code), 'label', v_label, 'rank', p_rank
  )::text, 'sha256'), 'hex');
  perform pg_advisory_xact_lock(hashtextextended(
    p_company_id::text || ':' || v_actor::text || ':' || v_key, 0
  ));
  select * into v_existing from public.activity_events
  where company_id = p_company_id and idempotency_key = v_key;
  if found then
    if v_existing.activity_type <> 'seniority_level.created'
      or v_existing.metadata ->> 'intentFingerprint' <> v_fingerprint
    then raise exception using errcode = '23505', message = 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('status', 'idempotent_retry', 'seniorityLevelId', v_existing.entity_id);
  end if;

  begin
    insert into public.seniority_levels (company_id, code, label, rank, active)
    values (p_company_id, v_code, v_label, p_rank, true)
    returning id into v_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  perform public.append_people_organization_activity(
    p_company_id, 'seniority_level.created', 'organization', 'Nível de senioridade criado',
    'O nível de senioridade ' || v_label || ' foi criado.', 'seniority_level', v_id,
    null, null,
    jsonb_build_object(
      'seniorityLevelId', v_id, 'code', v_code, 'label', v_label, 'rank', p_rank,
      'intentFingerprint', v_fingerprint
    ), v_key
  );
  return jsonb_build_object('status', 'succeeded', 'seniorityLevelId', v_id);
end;
$$;

-- Update ----------------------------------------------------------------------
create or replace function public.update_tenant_seniority_level_v1(
  p_company_id uuid,
  p_seniority_level_id uuid,
  p_code text,
  p_label text,
  p_rank integer
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_current public.seniority_levels%rowtype;
  v_code text := btrim(p_code);
  v_label text := btrim(p_label);
begin
  perform public.require_people_organization_mutator(p_company_id);

  -- Editing targets an ACTIVE level; archive is the dedicated operation.
  select * into v_current from public.seniority_levels
  where id = p_seniority_level_id and company_id = p_company_id and active = true
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SENIORITY_LEVEL_NOT_FOUND';
  end if;

  if v_code is null or char_length(v_code) not between 1 and 40
    or v_label is null or char_length(v_label) not between 1 and 80
    or p_rank is null or p_rank < 0
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  begin
    update public.seniority_levels set
      code = v_code, label = v_label, rank = p_rank, updated_at = now()
    where id = p_seniority_level_id and company_id = p_company_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  perform public.append_people_organization_activity(
    p_company_id, 'seniority_level.updated', 'organization', 'Nível de senioridade atualizado',
    'O nível de senioridade ' || v_label || ' foi atualizado.', 'seniority_level', p_seniority_level_id,
    null, null, jsonb_build_object(
      'seniorityLevelId', p_seniority_level_id, 'code', v_code, 'label', v_label, 'rank', p_rank,
      'previousCode', v_current.code, 'previousLabel', v_current.label, 'previousRank', v_current.rank
    )
  );
  return jsonb_build_object('status', 'succeeded', 'seniorityLevelId', p_seniority_level_id);
end;
$$;

-- Archive (soft, via active = false) -------------------------------------------
create or replace function public.archive_tenant_seniority_level_v1(
  p_company_id uuid,
  p_seniority_level_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_current public.seniority_levels%rowtype;
begin
  perform public.require_people_organization_mutator(p_company_id);

  select * into v_current from public.seniority_levels
  where id = p_seniority_level_id and company_id = p_company_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'SENIORITY_LEVEL_NOT_FOUND';
  end if;
  if v_current.active = false then
    return jsonb_build_object('status', 'already_archived', 'seniorityLevelId', p_seniority_level_id);
  end if;

  -- Soft archive only; the historical row is preserved. No position-usage check:
  -- position_seniority_profiles do not exist yet (Slice 2A/2B).
  update public.seniority_levels set active = false, updated_at = now()
  where id = p_seniority_level_id and company_id = p_company_id;

  perform public.append_people_organization_activity(
    p_company_id, 'seniority_level.archived', 'organization', 'Nível de senioridade arquivado',
    'O nível de senioridade ' || v_current.label || ' foi arquivado.',
    'seniority_level', p_seniority_level_id, null, null,
    jsonb_build_object('seniorityLevelId', p_seniority_level_id, 'code', v_current.code, 'label', v_current.label)
  );
  return jsonb_build_object('status', 'succeeded', 'seniorityLevelId', p_seniority_level_id);
end;
$$;

revoke all on function public.create_tenant_seniority_level_v1(uuid, text, text, integer, text)
  from public, anon, authenticated, service_role;
revoke all on function public.update_tenant_seniority_level_v1(uuid, uuid, text, text, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_seniority_level_v1(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.create_tenant_seniority_level_v1(uuid, text, text, integer, text),
  public.update_tenant_seniority_level_v1(uuid, uuid, text, text, integer),
  public.archive_tenant_seniority_level_v1(uuid, uuid)
  to authenticated;

notify pgrst, 'reload schema';
