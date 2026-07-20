alter table public.teams
  add column if not exists department_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'teams_department_id_fkey'
      and conrelid = 'public.teams'::regclass
  ) then
    alter table public.teams
      add constraint teams_department_id_fkey
      foreign key (department_id)
      references public.departments(id)
      on delete set null;
  end if;
end
$$;

create index if not exists teams_company_department_idx
  on public.teams (
    company_id,
    department_id
  )
  where deleted_at is null;

comment on column public.teams.department_id is
  'Departamento organizacional ao qual o time pertence.';
