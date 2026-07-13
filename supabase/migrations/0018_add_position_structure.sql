alter table public.positions
  add column if not exists department_id uuid references public.departments(id) on delete set null;

alter table public.positions
  add column if not exists hierarchical_level text not null default 'analyst';

alter table public.positions
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'positions_hierarchical_level_check'
  ) then
    alter table public.positions
      add constraint positions_hierarchical_level_check
      check (
        hierarchical_level in (
          'intern',
          'assistant',
          'analyst',
          'specialist',
          'coordinator',
          'supervisor',
          'manager',
          'director',
          'executive'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'positions_status_check'
  ) then
    alter table public.positions
      add constraint positions_status_check
      check (
        status in (
          'draft',
          'active',
          'inactive',
          'obsolete'
        )
      );
  end if;
end $$;

create index if not exists positions_department_id_idx
  on public.positions(department_id);

create index if not exists positions_status_idx
  on public.positions(status);

create index if not exists positions_hierarchical_level_idx
  on public.positions(hierarchical_level);