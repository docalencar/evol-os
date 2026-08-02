-- ADR-0012 — tenant-owned integrity: Organization, People and Competencies

do $$
begin
  if exists (
    select 1 from public.people group by id, company_id having count(*) > 1
  ) or exists (
    select 1 from public.departments group by id, company_id having count(*) > 1
  ) or exists (
    select 1 from public.teams group by id, company_id having count(*) > 1
  ) or exists (
    select 1 from public.positions group by id, company_id having count(*) > 1
  ) or exists (
    select 1 from public.competencies group by id, company_id having count(*) > 1
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_DUPLICATE_CANDIDATE_KEY';
  end if;

  if exists (
    select 1
    from public.departments source
    left join public.departments target on target.id = source.parent_department_id
    where source.parent_department_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_DEPARTMENT_PARENT';
  end if;

  if exists (
    select 1
    from public.departments source
    left join public.people target on target.id = source.manager_id
    where source.manager_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_DEPARTMENT_MANAGER';
  end if;

  if exists (
    select 1
    from public.teams source
    left join public.teams target on target.id = source.parent_team_id
    where source.parent_team_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_TEAM_PARENT';
  end if;

  if exists (
    select 1
    from public.teams source
    left join public.departments target on target.id = source.department_id
    where source.department_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_TEAM_DEPARTMENT';
  end if;

  if exists (
    select 1
    from public.teams source
    left join public.people target on target.id = source.manager_id
    where source.manager_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_TEAM_MANAGER';
  end if;

  if exists (
    select 1
    from public.positions source
    left join public.departments target on target.id = source.department_id
    where source.department_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_POSITION_DEPARTMENT';
  end if;

  if exists (
    select 1
    from public.people source
    left join public.people target on target.id = source.manager_id
    where source.manager_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_PERSON_MANAGER';
  end if;

  if exists (
    select 1
    from public.people source
    left join public.teams target on target.id = source.team_id
    where source.team_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_PERSON_TEAM';
  end if;

  if exists (
    select 1
    from public.people source
    left join public.positions target on target.id = source.position_id
    where source.position_id is not null
      and (target.id is null or target.company_id <> source.company_id)
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_PERSON_POSITION';
  end if;

  if exists (
    select 1
    from public.position_competencies source
    left join public.positions target on target.id = source.position_id
    where target.id is null or target.company_id <> source.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_POSITION_COMPETENCY_POSITION';
  end if;

  if exists (
    select 1
    from public.position_competencies source
    left join public.competencies target on target.id = source.competency_id
    where target.id is null or target.company_id <> source.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_POSITION_COMPETENCY_COMPETENCY';
  end if;

  if exists (
    select 1
    from public.position_requirements source
    left join public.positions target on target.id = source.position_id
    where target.id is null or target.company_id <> source.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_POSITION_REQUIREMENT_POSITION';
  end if;

  if exists (
    select 1
    from public.employee_competencies source
    left join public.people target on target.id = source.employee_id
    where target.id is null or target.company_id <> source.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_EMPLOYEE_COMPETENCY_EMPLOYEE';
  end if;

  if exists (
    select 1
    from public.employee_competencies source
    left join public.competencies target on target.id = source.competency_id
    where target.id is null or target.company_id <> source.company_id
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_EMPLOYEE_COMPETENCY_COMPETENCY';
  end if;

  if exists (
    select id, company_id
    from (
      select id, company_id from public.people
      union all
      select id, company_id from public.departments
      union all
      select id, company_id from public.teams
      union all
      select id, company_id from public.positions
      union all
      select id, company_id from public.competencies
    ) candidate_keys
    where company_id is null
  ) then
    raise exception 'TENANT_INTEGRITY_PREFLIGHT_NULL_COMPANY';
  end if;
end
$$;

alter table public.people
  add constraint people_id_company_id_key unique (id, company_id);
alter table public.departments
  add constraint departments_id_company_id_key unique (id, company_id);
alter table public.teams
  add constraint teams_id_company_id_key unique (id, company_id);
alter table public.positions
  add constraint positions_id_company_id_key unique (id, company_id);
alter table public.competencies
  add constraint competencies_id_company_id_key unique (id, company_id);

create index idx_teams_parent_team_id on public.teams(parent_team_id);
create index idx_people_position_id on public.people(position_id);

alter table public.departments
  add constraint departments_parent_department_company_fkey
    foreign key (parent_department_id, company_id)
    references public.departments(id, company_id)
    on delete set null (parent_department_id) not valid,
  add constraint departments_manager_company_fkey
    foreign key (manager_id, company_id)
    references public.people(id, company_id)
    on delete set null (manager_id) not valid;

alter table public.teams
  add constraint teams_parent_team_company_fkey
    foreign key (parent_team_id, company_id)
    references public.teams(id, company_id)
    on delete set null (parent_team_id) not valid,
  add constraint teams_department_company_fkey
    foreign key (department_id, company_id)
    references public.departments(id, company_id)
    on delete set null (department_id) not valid,
  add constraint teams_manager_company_fkey
    foreign key (manager_id, company_id)
    references public.people(id, company_id)
    on delete set null (manager_id) not valid;

alter table public.positions
  add constraint positions_department_company_fkey
    foreign key (department_id, company_id)
    references public.departments(id, company_id)
    on delete set null (department_id) not valid;

alter table public.people
  add constraint people_manager_company_fkey
    foreign key (manager_id, company_id)
    references public.people(id, company_id)
    on delete set null (manager_id) not valid,
  add constraint people_team_company_fkey
    foreign key (team_id, company_id)
    references public.teams(id, company_id)
    on delete set null (team_id) not valid,
  add constraint people_position_company_fkey
    foreign key (position_id, company_id)
    references public.positions(id, company_id)
    on delete set null (position_id) not valid;

alter table public.position_competencies
  add constraint position_competencies_position_company_fkey
    foreign key (position_id, company_id)
    references public.positions(id, company_id)
    on delete cascade not valid,
  add constraint position_competencies_competency_company_fkey
    foreign key (competency_id, company_id)
    references public.competencies(id, company_id)
    on delete cascade not valid;

alter table public.position_requirements
  add constraint position_requirements_position_company_fkey
    foreign key (position_id, company_id)
    references public.positions(id, company_id)
    on delete cascade not valid;

alter table public.employee_competencies
  add constraint employee_competencies_employee_company_fkey
    foreign key (employee_id, company_id)
    references public.people(id, company_id)
    on delete cascade not valid,
  add constraint employee_competencies_competency_company_fkey
    foreign key (competency_id, company_id)
    references public.competencies(id, company_id)
    on delete cascade not valid;

alter table public.departments
  validate constraint departments_parent_department_company_fkey,
  validate constraint departments_manager_company_fkey;
alter table public.teams
  validate constraint teams_parent_team_company_fkey,
  validate constraint teams_department_company_fkey,
  validate constraint teams_manager_company_fkey;
alter table public.positions
  validate constraint positions_department_company_fkey;
alter table public.people
  validate constraint people_manager_company_fkey,
  validate constraint people_team_company_fkey,
  validate constraint people_position_company_fkey;
alter table public.position_competencies
  validate constraint position_competencies_position_company_fkey,
  validate constraint position_competencies_competency_company_fkey;
alter table public.position_requirements
  validate constraint position_requirements_position_company_fkey;
alter table public.employee_competencies
  validate constraint employee_competencies_employee_company_fkey,
  validate constraint employee_competencies_competency_company_fkey;

alter table public.departments
  drop constraint departments_parent_department_id_fkey,
  drop constraint departments_manager_id_fkey;
alter table public.teams
  drop constraint teams_parent_team_id_fkey,
  drop constraint teams_department_id_fkey,
  drop constraint teams_manager_id_fkey;
alter table public.positions
  drop constraint positions_department_id_fkey;
alter table public.people
  drop constraint people_manager_id_fkey,
  drop constraint people_team_id_fkey,
  drop constraint people_position_id_fkey;
alter table public.position_competencies
  drop constraint position_competencies_position_id_fkey,
  drop constraint position_competencies_competency_id_fkey;
alter table public.position_requirements
  drop constraint position_requirements_position_id_fkey;
alter table public.employee_competencies
  drop constraint employee_competencies_employee_id_fkey,
  drop constraint employee_competencies_competency_id_fkey;
