alter table public.assessment_sections
  add column if not exists code text;

alter table public.assessment_sections
  add column if not exists icon text;

alter table public.assessment_sections
  add column if not exists color text;

alter table public.assessment_sections
  add column if not exists weight numeric(5,2)
  not null
  default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assessment_sections_weight_check'
  ) then
    alter table public.assessment_sections
      add constraint assessment_sections_weight_check
      check (
        weight > 0
        and weight <= 100
      );
  end if;
end $$;

create index if not exists assessment_sections_code_idx
  on public.assessment_sections(company_id, code)
  where code is not null
    and deleted_at is null;

alter table public.assessment_sections
  enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'assessment_sections'
      and policyname = 'members can read assessment sections'
  ) then
    create policy "members can read assessment sections"
    on public.assessment_sections
    for select
    using (
      public.is_company_member(company_id)
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'assessment_sections'
      and policyname = 'admins and hr create assessment sections'
  ) then
    create policy "admins and hr create assessment sections"
    on public.assessment_sections
    for insert
    with check (
      public.has_company_role(
        company_id,
        array['owner', 'admin', 'hr']
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'assessment_sections'
      and policyname = 'admins and hr update assessment sections'
  ) then
    create policy "admins and hr update assessment sections"
    on public.assessment_sections
    for update
    using (
      public.has_company_role(
        company_id,
        array['owner', 'admin', 'hr']
      )
    )
    with check (
      public.has_company_role(
        company_id,
        array['owner', 'admin', 'hr']
      )
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'assessment_sections'
      and policyname = 'admins and hr delete assessment sections'
  ) then
    create policy "admins and hr delete assessment sections"
    on public.assessment_sections
    for delete
    using (
      public.has_company_role(
        company_id,
        array['owner', 'admin', 'hr']
      )
    );
  end if;
end $$;

notify pgrst, 'reload schema';
