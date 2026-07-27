alter table public.departments
add column if not exists organization_unit_id uuid;


do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'departments_organization_unit_id_fkey'
  ) then

    alter table public.departments
      add constraint departments_organization_unit_id_fkey
      foreign key (
        organization_unit_id
      )
      references public.organization_units(id)
      on delete set null;

  end if;
end $$;


create index if not exists departments_organization_unit_idx
on public.departments(
  organization_unit_id
)
where deleted_at is null;


comment on column public.departments.organization_unit_id is
'Unidade organizacional à qual o departamento pertence.';