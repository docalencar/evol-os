alter table public.teams
  add column if not exists department_id uuid references public.departments(id) on delete set null,
  add column if not exists manager_id uuid references public.people(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create index if not exists idx_teams_department_id
  on public.teams(department_id);

create index if not exists idx_teams_manager_id
  on public.teams(manager_id);

create index if not exists idx_teams_deleted_at
  on public.teams(deleted_at);
