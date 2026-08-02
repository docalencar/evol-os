-- ADR-0012 — tenant-owned integrity: Recruitment slice 2

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'people_id_company_id_key'
      and conrelid = 'public.people'::regclass
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'departments_id_company_id_key'
      and conrelid = 'public.departments'::regclass
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'positions_id_company_id_key'
      and conrelid = 'public.positions'::regclass
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_MISSING_CANDIDATE_KEY';
  end if;

  if exists (
    select 1
    from public.recruitment_job_openings source
    left join public.people target on target.id = source.approver_id
    where source.approver_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_RECRUITMENT_APPROVER';
  end if;

  if exists (
    select 1
    from public.recruitment_job_openings source
    left join public.departments target on target.id = source.department_id
    where target.id is null or target.company_id <> source.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_RECRUITMENT_DEPARTMENT';
  end if;

  if exists (
    select 1
    from public.recruitment_job_openings source
    left join public.positions target on target.id = source.position_id
    where target.id is null or target.company_id <> source.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_RECRUITMENT_POSITION';
  end if;

  if exists (
    select 1
    from public.recruitment_job_openings source
    left join public.people target on target.id = source.recruiter_id
    where source.recruiter_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_RECRUITMENT_RECRUITER';
  end if;

  if exists (
    select 1
    from public.recruitment_job_openings source
    left join public.people target on target.id = source.replaced_employee_id
    where source.replaced_employee_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_RECRUITMENT_REPLACED_EMPLOYEE';
  end if;

  if exists (
    select 1
    from public.recruitment_job_openings source
    left join public.people target on target.id = source.requesting_manager_id
    where target.id is null or target.company_id <> source.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_RECRUITMENT_REQUESTING_MANAGER';
  end if;
end
$$;

create index recruitment_job_openings_approver_company_idx
  on public.recruitment_job_openings(approver_id, company_id);
create index recruitment_job_openings_department_company_idx
  on public.recruitment_job_openings(department_id, company_id);
create index recruitment_job_openings_position_company_idx
  on public.recruitment_job_openings(position_id, company_id);
create index recruitment_job_openings_recruiter_company_idx
  on public.recruitment_job_openings(recruiter_id, company_id);
create index recruitment_job_openings_replaced_employee_company_idx
  on public.recruitment_job_openings(replaced_employee_id, company_id);
create index recruitment_job_openings_requesting_manager_company_idx
  on public.recruitment_job_openings(requesting_manager_id, company_id);

alter table public.recruitment_job_openings
  add constraint recruitment_job_openings_approver_company_fkey
    foreign key (approver_id, company_id)
    references public.people(id, company_id)
    on delete restrict not valid,
  add constraint recruitment_job_openings_department_company_fkey
    foreign key (department_id, company_id)
    references public.departments(id, company_id)
    on delete restrict not valid,
  add constraint recruitment_job_openings_position_company_fkey
    foreign key (position_id, company_id)
    references public.positions(id, company_id)
    on delete restrict not valid,
  add constraint recruitment_job_openings_recruiter_company_fkey
    foreign key (recruiter_id, company_id)
    references public.people(id, company_id)
    on delete set null (recruiter_id) not valid,
  add constraint recruitment_job_openings_replaced_employee_company_fkey
    foreign key (replaced_employee_id, company_id)
    references public.people(id, company_id)
    on delete restrict not valid,
  add constraint recruitment_job_openings_requesting_manager_company_fkey
    foreign key (requesting_manager_id, company_id)
    references public.people(id, company_id)
    on delete restrict not valid;

alter table public.recruitment_job_openings
  validate constraint recruitment_job_openings_approver_company_fkey,
  validate constraint recruitment_job_openings_department_company_fkey,
  validate constraint recruitment_job_openings_position_company_fkey,
  validate constraint recruitment_job_openings_recruiter_company_fkey,
  validate constraint recruitment_job_openings_replaced_employee_company_fkey,
  validate constraint recruitment_job_openings_requesting_manager_company_fkey;

alter table public.recruitment_job_openings
  drop constraint recruitment_job_openings_approver_id_fkey,
  drop constraint recruitment_job_openings_department_id_fkey,
  drop constraint recruitment_job_openings_position_id_fkey,
  drop constraint recruitment_job_openings_recruiter_id_fkey,
  drop constraint recruitment_job_openings_replaced_employee_id_fkey,
  drop constraint recruitment_job_openings_requesting_manager_id_fkey;
