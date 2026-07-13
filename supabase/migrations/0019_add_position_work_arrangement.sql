alter table public.positions
  add column if not exists weekly_workload_hours integer not null default 44;

alter table public.positions
  add column if not exists work_model text not null default 'on_site';

alter table public.positions
  add column if not exists employment_type text not null default 'clt';

alter table public.positions
  add column if not exists travel_requirement text not null default 'none';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'positions_weekly_workload_hours_check'
      and conrelid = 'public.positions'::regclass
  ) then
    alter table public.positions
      add constraint positions_weekly_workload_hours_check
      check (
        weekly_workload_hours between 1 and 168
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'positions_work_model_check'
      and conrelid = 'public.positions'::regclass
  ) then
    alter table public.positions
      add constraint positions_work_model_check
      check (
        work_model in (
          'on_site',
          'hybrid',
          'remote'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'positions_employment_type_check'
      and conrelid = 'public.positions'::regclass
  ) then
    alter table public.positions
      add constraint positions_employment_type_check
      check (
        employment_type in (
          'clt',
          'pj',
          'intern',
          'apprentice',
          'temporary',
          'outsourced',
          'contractor',
          'other'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'positions_travel_requirement_check'
      and conrelid = 'public.positions'::regclass
  ) then
    alter table public.positions
      add constraint positions_travel_requirement_check
      check (
        travel_requirement in (
          'none',
          'occasional',
          'frequent'
        )
      );
  end if;
end $$;

create index if not exists positions_work_model_idx
  on public.positions(work_model);

create index if not exists positions_employment_type_idx
  on public.positions(employment_type);
  