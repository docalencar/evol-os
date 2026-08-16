-- MVP Closure PR 10D: minimal tenant-scoped Person contact projection used by
-- the server-side initial invitation flow. The company and Person UUIDs are
-- selectors only; auth.uid() plus an active owner/admin membership remain the
-- authority. This function adds no table grant and performs no mutation.

create or replace function public.get_tenant_person_invitation_contact_v1(
  p_company_id uuid,
  p_person_id uuid
)
returns table (
  person_id uuid,
  email text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text;
begin
  perform public.require_tenant_access_administrator(p_company_id, false);

  select person.email
  into v_email
  from public.people as person
  where person.company_id = p_company_id
    and person.id = p_person_id;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'TENANT_PERSON_NOT_FOUND';
  end if;

  return query
  select p_person_id, v_email;
end;
$$;

revoke all on function public.get_tenant_person_invitation_contact_v1(uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.get_tenant_person_invitation_contact_v1(uuid, uuid)
to authenticated;

comment on function public.get_tenant_person_invitation_contact_v1(uuid, uuid) is
  'Returns only person_id and persisted email for a Person in a tenant administered by the authenticated active owner/admin. Selectors grant no authority.';
