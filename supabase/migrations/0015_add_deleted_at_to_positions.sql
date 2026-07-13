alter table public.positions
  add column if not exists deleted_at timestamptz;

create index if not exists positions_company_active_idx
  on public.positions (company_id)
  where deleted_at is null;