-- Career / Seniority — Slice 5G-1: retire the legacy Position competency surface.
--
-- Canonical Position expectations live in position_seniority_competencies. This
-- migration fails closed unless every legacy row has an equivalent row on the
-- active Base profile, then removes the exact deprecated RPCs before the table.
-- No CASCADE is used.

do $$
declare
  v_unmatched bigint;
begin
  select count(*)
    into v_unmatched
  from public.position_competencies pc
  where not exists (
    select 1
    from public.position_seniority_profiles psp
    join public.position_seniority_competencies psc
      on psc.company_id = psp.company_id
     and psc.position_seniority_profile_id = psp.id
     and psc.competency_id = pc.competency_id
    where psp.company_id = pc.company_id
      and psp.position_id = pc.position_id
      and psp.seniority_level_id is null
      and psp.active
      and psc.expected_level = pc.expected_level
      and psc.weight = pc.weight
      and psc.required = pc.required
      and psc.type = pc.type
      and psc.notes is not distinct from pc.notes
      and (psc.archived_at is null) = (pc.archived_at is null)
  );

  if v_unmatched <> 0 then
    raise exception
      'SLICE_5G1_PARITY_FAILED: % legacy position competency rows lack a canonical Base equivalent',
      v_unmatched;
  end if;
end $$;

drop function if exists public.archive_tenant_position_competency_v1(uuid, uuid);

drop function if exists public.create_tenant_position_competency_v1(
  uuid,
  uuid,
  uuid,
  integer,
  integer,
  boolean,
  text,
  text
);

drop function if exists public.update_tenant_position_competency_v1(
  uuid,
  uuid,
  uuid,
  uuid,
  integer,
  integer,
  boolean,
  text,
  text
);

drop function if exists public.get_tenant_competency_directory_v1(uuid);
drop function if exists public.get_tenant_position_competencies_v1(uuid, uuid);

drop table if exists public.position_competencies;

notify pgrst, 'reload schema';
