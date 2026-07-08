alter table public.teams
  add column if not exists manager_id uuid references public.people(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;
