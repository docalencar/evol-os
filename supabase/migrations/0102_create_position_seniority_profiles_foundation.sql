-- Career / Seniority + Position Taxonomy — Slice 2A: Position-Seniority Profiles.
--
-- PD-021 (Approved) + ADR-0017 (Accepted). DB-first, DB-only.
--
-- position_seniority_profiles is the applicability anchor Position × Seniority:
-- every Cargo has >= 1 profile; a Cargo without seniority has exactly one BASE
-- profile with seniority_level_id = NULL; a Cargo with seniorities has one profile
-- per applicable seniority. People assignment and the competency matrix will
-- reference the profile in later slices — not here.
--
-- SCOPE (fully-decided parts only): table + composite tenant-safe FKs (ADR-0012)
-- + base/specific uniqueness + RLS (no grants) + deterministic base-profile
-- backfill (migration-only, no human Activity) + read boundary + add-applicable
-- boundary. The ARCHIVE/remove-applicability boundary is DEFERRED: its base-profile
-- archivability / last-profile-protection rule is not specified by PD-021/ADR-0017
-- and must be decided before it is built (see Slice 2A report).
--
-- Seniority-archive interaction: archiving a seniority (0100) is a soft flip
-- (active=false), not a delete, so the composite FK stays intact and a profile
-- that references a now-archived seniority remains as history. No change to 0100
-- is required.

-- Table -----------------------------------------------------------------------
create table if not exists public.position_seniority_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  position_id uuid not null,
  seniority_level_id uuid,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Composite tenant-safe key so future FKs (People, competency matrix) can
  -- reference (id, company_id) per ADR-0012.
  constraint position_seniority_profiles_id_company_id_key unique (id, company_id),
  -- Tenant-safe references: the position and seniority must belong to the same
  -- company. NULL seniority_level_id (base profile) is not FK-enforced by SQL.
  constraint position_seniority_profiles_position_company_fkey
    foreign key (position_id, company_id)
    references public.positions(id, company_id) on delete restrict,
  constraint position_seniority_profiles_seniority_company_fkey
    foreign key (seniority_level_id, company_id)
    references public.seniority_levels(id, company_id) on delete restrict
);

-- Exactly one ACTIVE base profile (seniority NULL) per position.
create unique index if not exists position_seniority_profiles_base_active_unique
  on public.position_seniority_profiles (position_id)
  where seniority_level_id is null and active;

-- At most one ACTIVE profile per (position, seniority) for specific seniorities.
create unique index if not exists position_seniority_profiles_specific_active_unique
  on public.position_seniority_profiles (position_id, seniority_level_id)
  where seniority_level_id is not null and active;

create index if not exists position_seniority_profiles_company_position_idx
  on public.position_seniority_profiles (company_id, position_id);

-- RLS defense-in-depth, standard tenant policies. No table grants: all writes go
-- through the boundaries below; reads go through the read boundary.
alter table public.position_seniority_profiles enable row level security;

create policy "members can read position seniority profiles"
  on public.position_seniority_profiles for select
  using (public.is_company_member(company_id));

create policy "admins and hr manage position seniority profiles"
  on public.position_seniority_profiles for all
  using (public.has_company_role(company_id, array['owner','admin','hr']));

-- Backfill: one base profile (seniority NULL, active) for every non-deleted
-- position that does not already have one. Deterministic, idempotent, migration
-- only (no Activity events — this is not a human action).
insert into public.position_seniority_profiles (company_id, position_id, seniority_level_id, active)
select p.company_id, p.id, null, true
from public.positions p
where p.deleted_at is null
  and not exists (
    select 1 from public.position_seniority_profiles pr
    where pr.position_id = p.id
      and pr.seniority_level_id is null
      and pr.active
  );

-- Read boundary (membership-gated) -------------------------------------------
create or replace function public.get_tenant_position_seniority_profiles_v1(
  p_company_id uuid,
  p_position_id uuid,
  p_include_inactive boolean default false
)
returns table(
  id uuid,
  position_id uuid,
  seniority_level_id uuid,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if not public.is_company_member(p_company_id) then
    raise exception using errcode = '42501', message = 'TENANT_AUTHORIZATION_DENIED';
  end if;

  return query
    select pr.id, pr.position_id, pr.seniority_level_id, pr.active,
      pr.created_at, pr.updated_at
    from public.position_seniority_profiles pr
    where pr.company_id = p_company_id
      and pr.position_id = p_position_id
      and (p_include_inactive or pr.active)
    -- base profile (NULL seniority) first, then deterministic by seniority, id.
    order by (pr.seniority_level_id is not null), pr.seniority_level_id, pr.id;
end;
$$;

-- Add-applicable-seniority boundary (owner/admin/hr) --------------------------
-- Idempotent on the natural key (position, seniority): re-adding an already
-- applicable seniority returns already_applicable instead of a confusing CONFLICT.
create or replace function public.add_tenant_position_seniority_profile_v1(
  p_company_id uuid,
  p_position_id uuid,
  p_seniority_level_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_id uuid;
  v_existing uuid;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);

  -- A base profile is created only by the backfill, never added here.
  if p_seniority_level_id is null then
    raise exception using errcode = '22023', message = 'BASE_PROFILE_NOT_ADDABLE';
  end if;

  -- The position must be a live tenant position.
  if not exists (
    select 1 from public.positions p
    where p.id = p_position_id and p.company_id = p_company_id and p.deleted_at is null
  ) then
    raise exception using errcode = 'P0002', message = 'POSITION_NOT_FOUND';
  end if;

  -- The seniority must be an ACTIVE tenant seniority.
  if not exists (
    select 1 from public.seniority_levels s
    where s.id = p_seniority_level_id and s.company_id = p_company_id and s.active
  ) then
    raise exception using errcode = 'P0002', message = 'SENIORITY_LEVEL_NOT_FOUND';
  end if;

  select pr.id into v_existing from public.position_seniority_profiles pr
  where pr.company_id = p_company_id and pr.position_id = p_position_id
    and pr.seniority_level_id = p_seniority_level_id and pr.active;
  if found then
    return jsonb_build_object('status', 'already_applicable', 'profileId', v_existing);
  end if;

  begin
    insert into public.position_seniority_profiles (
      company_id, position_id, seniority_level_id, active
    ) values (p_company_id, p_position_id, p_seniority_level_id, true)
    returning id into v_id;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'CONFLICT';
  end;

  perform public.append_people_organization_activity(
    p_company_id, 'position_seniority_profile.created', 'organization',
    'Senioridade aplicada ao cargo',
    'Uma senioridade foi aplicada a um cargo.', 'position', p_position_id,
    null, null,
    jsonb_build_object(
      'profileId', v_id, 'positionId', p_position_id, 'seniorityLevelId', p_seniority_level_id
    )
  );
  return jsonb_build_object('status', 'succeeded', 'profileId', v_id);
end;
$$;

-- Archive-applicability boundary (owner/admin/hr) ----------------------------
-- Only SPECIFIC profiles (seniority_level_id NOT NULL) may be archived. The BASE
-- profile is a structural anchor and is never archivable, which structurally
-- guarantees every non-deleted position keeps an active profile (no separate
-- last-profile trigger needed). Soft archive; idempotent; history preserved.
create or replace function public.archive_tenant_position_seniority_profile_v1(
  p_company_id uuid,
  p_position_seniority_profile_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_current public.position_seniority_profiles%rowtype;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);

  select * into v_current from public.position_seniority_profiles
  where id = p_position_seniority_profile_id and company_id = p_company_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'POSITION_SENIORITY_PROFILE_NOT_FOUND';
  end if;

  -- The base profile (NULL seniority) is the anchor and cannot be archived.
  if v_current.seniority_level_id is null then
    raise exception using errcode = '22023', message = 'BASE_PROFILE_NOT_ARCHIVABLE';
  end if;

  if v_current.active = false then
    return jsonb_build_object('status', 'already_archived', 'profileId', p_position_seniority_profile_id);
  end if;

  update public.position_seniority_profiles set active = false, updated_at = now()
  where id = p_position_seniority_profile_id and company_id = p_company_id;

  perform public.append_people_organization_activity(
    p_company_id, 'position_seniority_profile.archived', 'organization',
    'Senioridade removida do cargo',
    'Uma senioridade aplicada a um cargo foi arquivada.', 'position', v_current.position_id,
    null, null,
    jsonb_build_object(
      'profileId', p_position_seniority_profile_id, 'positionId', v_current.position_id,
      'seniorityLevelId', v_current.seniority_level_id
    )
  );
  return jsonb_build_object('status', 'succeeded', 'profileId', p_position_seniority_profile_id);
end;
$$;

revoke all on function public.get_tenant_position_seniority_profiles_v1(uuid, uuid, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.add_tenant_position_seniority_profile_v1(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.archive_tenant_position_seniority_profile_v1(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_tenant_position_seniority_profiles_v1(uuid, uuid, boolean),
  public.add_tenant_position_seniority_profile_v1(uuid, uuid, uuid),
  public.archive_tenant_position_seniority_profile_v1(uuid, uuid)
  to authenticated;

notify pgrst, 'reload schema';
