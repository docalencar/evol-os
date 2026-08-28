-- Career / Seniority + Position Taxonomy — Slice 4A: Competency Matrix Relocation.
--
-- PD-021 (Approved) + ADR-0017 (Accepted). DB-first, DB-only, ADDITIVE.
--
-- Introduces the profile-based competency expectation matrix
-- `position_seniority_competencies` (Position × Seniority Profile × Competency) and
-- backfills every existing `position_competencies` row to the ACTIVE BASE PROFILE
-- (seniority_level_id NULL) of the same Position, preserving expected_level, weight,
-- required, type, notes, archived_at, created_at, updated_at exactly.
--
-- COMPATIBILITY: `position_competencies` remains physically intact and functional;
-- its trusted mutation boundaries (0108) and reads are untouched. This slice adds
-- NO write/read boundary and NO UI for the new matrix — those arrive in Slice 4B.
-- NO dual-write. NO removal of the old table (physical removal is post-MVP).
--
-- FAIL-CLOSED: the backfill proves zero-loss in the same transaction and RAISES
-- (aborting the whole migration) if any source row is UNMAPPABLE (no unique active
-- base profile) or if the active target uniqueness would CONFLICT, or if the final
-- target count does not equal the source count. No ON CONFLICT DO NOTHING; nothing
-- is discarded silently. The read-only Review audit measured SOURCE=3, TARGET=3,
-- UNMAPPABLE=0, CONFLICT=0 (BACKFILL_READY=YES); these guards protect every other
-- environment regardless.
--
-- Composite tenant-safe keys per ADR-0012; RLS enabled with standard tenant
-- policies; NO table grants (writes flow through future boundaries; reads via the
-- old compatibility path until 4B). Mirrors the established 0102/0005 patterns.

-- Table -----------------------------------------------------------------------
create table if not exists public.position_seniority_competencies (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id) on delete cascade,

  position_seniority_profile_id uuid not null,

  competency_id uuid not null,

  expected_level integer not null default 3
    check (expected_level between 1 and 5),

  weight integer not null default 1
    check (weight between 1 and 5),

  required boolean not null default true,

  type text not null default 'core'
    check (type in ('core', 'leadership', 'promotion', 'optional')),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,

  -- Composite tenant-safe key so future FKs can reference (id, company_id) per
  -- ADR-0012.
  constraint position_seniority_competencies_id_company_id_key unique (id, company_id),

  -- Tenant-safe references: the profile and the competency must belong to the same
  -- company. Restrict (not cascade) is fail-closed — a hard delete of a referenced
  -- profile/competency aborts rather than silently dropping matrix rows.
  constraint position_seniority_competencies_profile_company_fkey
    foreign key (position_seniority_profile_id, company_id)
    references public.position_seniority_profiles(id, company_id) on delete restrict,

  constraint position_seniority_competencies_competency_company_fkey
    foreign key (competency_id, company_id)
    references public.competencies(id, company_id) on delete restrict
);

-- Exactly one ACTIVE requirement per (profile, competency); archived history rows
-- are unconstrained (mirrors position_competencies_active_unique).
create unique index if not exists position_seniority_competencies_active_unique
  on public.position_seniority_competencies (company_id, position_seniority_profile_id, competency_id)
  where archived_at is null;

create index if not exists position_seniority_competencies_company_id_idx
  on public.position_seniority_competencies (company_id);
create index if not exists position_seniority_competencies_profile_idx
  on public.position_seniority_competencies (position_seniority_profile_id);
create index if not exists position_seniority_competencies_competency_idx
  on public.position_seniority_competencies (competency_id);

-- RLS defense-in-depth, standard tenant policies. No table grants: writes go
-- through the (future 4B) boundaries; reads stay on the compatibility path.
alter table public.position_seniority_competencies enable row level security;

create policy "members can read position seniority competencies"
  on public.position_seniority_competencies for select
  using (public.is_company_member(company_id));

create policy "admins and hr manage position seniority competencies"
  on public.position_seniority_competencies for all
  using (public.has_company_role(company_id, array['owner', 'admin', 'hr']));

-- Zero-loss, fail-closed backfill (migration-only; no Activity — not a human
-- action). Each position_competencies -> active base profile of the same Position.
do $$
declare
  v_source   bigint;
  v_target   bigint;
  v_conflict bigint;
  v_final    bigint;
begin
  select count(*) into v_source from public.position_competencies;

  -- Mappable source rows: exactly one active base profile for (company, position).
  select count(*) into v_target
  from public.position_competencies pc
  join public.position_seniority_profiles bp
    on bp.company_id = pc.company_id
   and bp.position_id = pc.position_id
   and bp.seniority_level_id is null
   and bp.active;

  if (v_source - v_target) <> 0 then
    raise exception
      'SLICE_4A_UNMAPPABLE: % of % position_competencies rows have no unique active base profile',
      v_source - v_target, v_source;
  end if;

  -- Active target-uniqueness collisions among mappable rows.
  select coalesce(sum(c), 0) into v_conflict from (
    select count(*) c
    from public.position_competencies pc
    join public.position_seniority_profiles bp
      on bp.company_id = pc.company_id
     and bp.position_id = pc.position_id
     and bp.seniority_level_id is null
     and bp.active
    where pc.archived_at is null
    group by bp.id, pc.competency_id
    having count(*) > 1
  ) k;

  if v_conflict <> 0 then
    raise exception
      'SLICE_4A_CONFLICT: % active requirements would collide on (profile, competency)',
      v_conflict;
  end if;

  insert into public.position_seniority_competencies (
    company_id, position_seniority_profile_id, competency_id,
    expected_level, weight, required, type, notes,
    created_at, updated_at, archived_at
  )
  select
    pc.company_id, bp.id, pc.competency_id,
    pc.expected_level, pc.weight, pc.required, pc.type, pc.notes,
    pc.created_at, pc.updated_at, pc.archived_at
  from public.position_competencies pc
  join public.position_seniority_profiles bp
    on bp.company_id = pc.company_id
   and bp.position_id = pc.position_id
   and bp.seniority_level_id is null
   and bp.active
  -- Idempotency guard (re-run safety); it never masks a mismatch because the
  -- final zero-loss count is asserted below.
  where not exists (
    select 1 from public.position_seniority_competencies t
    where t.company_id = pc.company_id
      and t.position_seniority_profile_id = bp.id
      and t.competency_id = pc.competency_id
      and t.archived_at is not distinct from pc.archived_at
      and t.expected_level = pc.expected_level
      and t.weight = pc.weight
      and t.required = pc.required
      and t.type = pc.type
  );

  select count(*) into v_final from public.position_seniority_competencies;
  if v_final <> v_source then
    raise exception
      'SLICE_4A_COUNT_MISMATCH: target has % rows but source has % (zero-loss violated)',
      v_final, v_source;
  end if;
end $$;

notify pgrst, 'reload schema';
