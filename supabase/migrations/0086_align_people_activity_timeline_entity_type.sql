create or replace function public.get_tenant_entity_activity_timeline_v1(
  p_company_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_limit integer default 20
)
returns table(
  activity_id uuid,
  activity_type text,
  module text,
  title text,
  description text,
  actor_type text,
  entity_type text,
  entity_id uuid,
  occurred_at timestamptz,
  created_at timestamptz
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

  if p_entity_type is null
    or p_entity_type not in ('department', 'team', 'position', 'person') then
    raise exception using errcode = '22023', message = 'ACTIVITY_ENTITY_TYPE_INVALID';
  end if;

  if p_entity_id is null then
    raise exception using errcode = '22023', message = 'ACTIVITY_ENTITY_ID_REQUIRED';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 100 then
    raise exception using errcode = '22023', message = 'ACTIVITY_LIMIT_OUT_OF_RANGE';
  end if;

  return query
  select
    event.id,
    event.activity_type,
    event.module,
    event.title,
    event.description,
    event.actor_type,
    case when p_entity_type = 'person' then 'person' else event.entity_type end,
    case when p_entity_type = 'person' then p_entity_id else event.entity_id end,
    event.occurred_at,
    event.created_at
  from public.activity_events event
  where event.company_id = p_company_id
    and event.visibility = 'company'
    and (
      (
        p_entity_type <> 'person'
        and event.entity_type = p_entity_type
        and event.entity_id = p_entity_id
      )
      or (
        p_entity_type = 'person'
        and (
          (event.entity_type in ('person', 'employee') and event.entity_id = p_entity_id)
          or (event.subject_type in ('person', 'employee') and event.subject_id = p_entity_id)
        )
      )
    )
  order by event.occurred_at desc, event.id desc
  limit p_limit;
end;
$$;

revoke all on function public.get_tenant_entity_activity_timeline_v1(uuid, text, uuid, integer)
  from public, anon, authenticated, service_role;

grant execute on function public.get_tenant_entity_activity_timeline_v1(uuid, text, uuid, integer)
  to authenticated;

notify pgrst, 'reload schema';
