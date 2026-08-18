-- MVP Closure PR J1 Phase 2B.1: employee competency profile read boundary.
--
-- The People profile needs full employee-competency detail (source, validated_at,
-- notes) that the existing directory boundary (get_tenant_competency_directory_v1)
-- does not expose. employee_competencies has no direct SELECT for `authenticated`
-- (RLS policy without table grant), so the legacy direct read fails 42501.
--
-- This ADDITIVE, minimal boundary returns exactly the columns the authorized
-- management profile requires for a single employee. It mirrors the 0084/0085/0090
-- security posture: SECURITY DEFINER, hardened search_path, actor from auth.uid(),
-- membership gate (the canonical management-read authorization used by 0085/0090 and
-- by the employee_competencies SELECT RLS policy), company scoping, no table grants.
-- Termination is NOT filtered: an authorized manager keeps reading the historical
-- competency record of a terminated person. No Auth IDs are returned.

create or replace function public.get_tenant_employee_competencies_v1(p_company_id uuid, p_employee_id uuid)
returns table(employee_competency_id uuid, employee_id uuid, competency_id uuid, competency_name text,
  current_level integer, source text, validated_at timestamptz, notes text)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select ec.id, ec.employee_id, ec.competency_id, c.name, ec.current_level, ec.source, ec.validated_at, ec.notes
    from public.employee_competencies ec
    join public.competencies c on c.id=ec.competency_id and c.company_id=ec.company_id
    where ec.company_id=p_company_id and ec.employee_id=p_employee_id and ec.archived_at is null
    order by ec.created_at, ec.id;
end; $$;

revoke all on function public.get_tenant_employee_competencies_v1(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_tenant_employee_competencies_v1(uuid,uuid) to authenticated;

notify pgrst, 'reload schema';
