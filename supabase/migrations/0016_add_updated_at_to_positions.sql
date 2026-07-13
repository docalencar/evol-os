alter table public.positions
  add column if not exists updated_at timestamptz
  default now();

update public.positions
set updated_at = coalesce(
  updated_at,
  created_at,
  now()
)
where updated_at is null;

alter table public.positions
  alter column updated_at
  set default now();

alter table public.positions
  alter column updated_at
  set not null;