alter table public.organization_sync_timeline
add column if not exists receipts jsonb not null
default '[]'::jsonb;

notify pgrst, 'reload schema';
