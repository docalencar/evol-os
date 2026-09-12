-- E5-R1D: make the activity audit boundary independent of environment defaults.
--
-- Review inherited broad relation ACLs when migration 0039 created this table.
-- Local environments did not. RLS is not a substitute here: its SELECT policy
-- admits every company row, while the canonical timelines deliberately exclude
-- restricted audit events. Client roles therefore have no direct table path.

do $$
begin
  if to_regclass('public.activity_events') is null then
    raise exception using errcode = '42P01', message = 'ACTIVITY_EVENTS_TABLE_REQUIRED';
  end if;

  if to_regprocedure('public.get_tenant_activity_timeline_v1(uuid,integer)') is null
     or pg_get_functiondef(
       'public.get_tenant_activity_timeline_v1(uuid,integer)'::regprocedure
     ) not like '%visibility=''company''%' then
    raise exception using errcode = '42883', message = 'HARDENED_ACTIVITY_TIMELINE_REQUIRED';
  end if;
end;
$$;

revoke select, insert, update, delete, truncate, references, trigger, maintain
  on table public.activity_events
  from public, anon, authenticated;

notify pgrst, 'reload schema';
