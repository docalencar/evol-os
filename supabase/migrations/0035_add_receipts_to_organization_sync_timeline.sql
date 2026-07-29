do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n
      on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'organization_sync_timeline'
      and c.relkind = 'r'
  ) then
    alter table public.organization_sync_timeline
      add column if not exists receipts jsonb
      not null
      default '[]'::jsonb;
  end if;
end $$;

notify pgrst, 'reload schema';
