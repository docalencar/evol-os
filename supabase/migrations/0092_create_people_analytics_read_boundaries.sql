-- MVP Closure: People Analytics read boundaries.
--
-- The Analytics dashboard needs, from tenant-owned data: the open recruitment
-- job openings (their status and planned headcount) and the count of pending
-- recruitment job-opening approvals. recruitment_job_openings and
-- approval_requests have no direct SELECT for `authenticated`, so the legacy
-- direct reads failed 42501 and — inside an all-or-nothing Promise.all — took
-- the whole page down.
--
-- These additive, membership-gated SECURITY DEFINER boundaries expose only the
-- minimal columns the analytics calculators consume, mirroring the security
-- posture of 0084/0090/0091: hardened search_path, actor from auth.uid(),
-- is_company_member gate, company scoping, execute revoked from
-- public/anon/service_role and granted to authenticated. No table grants.

create or replace function public.get_tenant_recruitment_open_openings_v1(p_company_id uuid)
returns table(status text, current_headcount integer, target_headcount integer)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select j.status, j.current_headcount, j.target_headcount
    from public.recruitment_job_openings j
    where j.company_id=p_company_id and j.status='open' and j.deleted_at is null
    order by j.id;
end; $$;

create or replace function public.get_tenant_recruitment_pending_approvals_v1(p_company_id uuid)
returns table(status text)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query select a.status
    from public.approval_requests a
    where a.company_id=p_company_id and a.module='recruitment'
      and a.entity_type='job_opening' and a.status='pending'
    order by a.id;
end; $$;

revoke all on function public.get_tenant_recruitment_open_openings_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function public.get_tenant_recruitment_pending_approvals_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_tenant_recruitment_open_openings_v1(uuid),public.get_tenant_recruitment_pending_approvals_v1(uuid) to authenticated;

notify pgrst, 'reload schema';
