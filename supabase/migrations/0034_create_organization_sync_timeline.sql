create table if not exists public.organization_sync_timeline (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  started_at timestamptz not null,
  finished_at timestamptz not null,

  duration_ms integer not null
    check (duration_ms >= 0),

  applied_items integer not null default 0
    check (applied_items >= 0),

  skipped_items integer not null default 0
    check (skipped_items >= 0),

  failed_items integer not null default 0
    check (failed_items >= 0),

  entity_summary jsonb not null
    default '{}'::jsonb,

  operation_summary jsonb not null
    default '{}'::jsonb,

  warnings jsonb not null
    default '[]'::jsonb,

  errors jsonb not null
    default '[]'::jsonb,

  created_by uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null
    default now(),

  check (finished_at >= started_at)
);

create index if not exists
organization_sync_timeline_company_created_idx
on public.organization_sync_timeline(
  company_id,
  created_at desc
);

create index if not exists
organization_sync_timeline_created_by_idx
on public.organization_sync_timeline(
  created_by
);

alter table public.organization_sync_timeline
  enable row level security;

drop policy if exists
  "members can read organization sync timeline"
  on public.organization_sync_timeline;

drop policy if exists
  "admins and hr create organization sync timeline"
  on public.organization_sync_timeline;

create policy "members can read organization sync timeline"
on public.organization_sync_timeline
for select
using (
  public.is_company_member(company_id)
);

create policy "admins and hr create organization sync timeline"
on public.organization_sync_timeline
for insert
with check (
  created_by = auth.uid()
  and public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

notify pgrst, 'reload schema';
