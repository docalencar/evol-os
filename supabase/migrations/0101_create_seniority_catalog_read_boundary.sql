-- Career / Seniority + Position Taxonomy — Slice 1B-A: Seniority Catalog read boundary.
--
-- The 0100 catalog is written through trusted boundaries but has NO SELECT grant
-- for `authenticated` (RLS + no grant). The app reads company-owned catalogs only
-- through trusted read boundaries (0083/0085/0087), never direct selects. This
-- adds the seniority read boundary so Slice 1B-B can list the catalog without
-- opening any table grant.
--
-- Mirrors get_tenant_positions_management_v1: membership-gated (any active member
-- reads; mutation authority stays owner/admin/hr in 0100), STABLE SECURITY
-- DEFINER, hardened search_path, tenant-scoped, company_id NOT returned (no tenant
-- leak), deterministic order. Active-only by default; include_inactive is an
-- explicit opt-in for future administrative views. No table grants, no RLS/policy
-- changes; EXECUTE only to authenticated.

create or replace function public.get_tenant_seniority_levels_v1(
  p_company_id uuid,
  p_include_inactive boolean default false
)
returns table(
  id uuid,
  code text,
  label text,
  rank integer,
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
    select s.id, s.code, s.label, s.rank, s.active, s.created_at, s.updated_at
    from public.seniority_levels s
    where s.company_id = p_company_id
      and (p_include_inactive or s.active)
    -- rank is not unique; deterministic tie-break by label then id.
    order by s.rank asc, s.label asc, s.id asc;
end;
$$;

revoke all on function public.get_tenant_seniority_levels_v1(uuid, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.get_tenant_seniority_levels_v1(uuid, boolean)
  to authenticated;

notify pgrst, 'reload schema';
