-- PR-083D.1 — Organization Planning Change Sets

create table if not exists public.organization_planning_change_sets (
  id uuid primary key,
  company_id uuid not null
    references public.companies(id)
    on delete cascade,
  scenario_id uuid not null,
  change_type text not null,
  payload jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organization_planning_change_sets_scenario_company_fk
    foreign key (scenario_id, company_id)
    references public.organization_planning_scenarios(id, company_id)
    on delete cascade,

  constraint organization_planning_change_sets_change_type_check
    check (
      char_length(trim(change_type)) between 1 and 120
    ),

  constraint organization_planning_change_sets_payload_object_check
    check (
      jsonb_typeof(payload) = 'object'
    ),

  constraint organization_planning_change_sets_version_check
    check (version > 0),

  constraint organization_planning_change_sets_id_company_key
    unique (id, company_id)
);

create index if not exists
  organization_planning_change_sets_company_scenario_idx
on public.organization_planning_change_sets(
  company_id,
  scenario_id,
  created_at asc
);

create index if not exists
  organization_planning_change_sets_scenario_type_idx
on public.organization_planning_change_sets(
  scenario_id,
  change_type,
  created_at asc
);

create or replace function
  public.validate_organization_planning_change_set_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_scenario_id uuid;
  target_company_id uuid;
  target_scenario_status text;
begin
  if tg_op = 'DELETE' then
    target_scenario_id := old.scenario_id;
    target_company_id := old.company_id;
  else
    target_scenario_id := new.scenario_id;
    target_company_id := new.company_id;
  end if;

  select scenario.status
    into target_scenario_status
  from public.organization_planning_scenarios as scenario
  where scenario.id = target_scenario_id
    and scenario.company_id = target_company_id;

  if target_scenario_status is null then
    raise exception 'PLANNING_SCENARIO_NOT_FOUND';
  end if;

  if target_scenario_status = 'published' then
    raise exception
      'PUBLISHED_PLANNING_SCENARIO_CHANGE_SETS_ARE_IMMUTABLE';
  end if;

  if tg_op = 'UPDATE' then
    if new.id <> old.id
      or new.company_id <> old.company_id
      or new.scenario_id <> old.scenario_id
    then
      raise exception
        'PLANNING_CHANGE_SET_IDENTITY_IS_IMMUTABLE';
    end if;

    new.updated_at := now();

    return new;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists
  validate_organization_planning_change_set_mutation
on public.organization_planning_change_sets;

create trigger
  validate_organization_planning_change_set_mutation
before insert or update or delete
on public.organization_planning_change_sets
for each row execute function
  public.validate_organization_planning_change_set_mutation();

alter table
  public.organization_planning_change_sets
enable row level security;

create policy "members can read planning change sets"
on public.organization_planning_change_sets
for select
using (
  public.is_company_member(company_id)
);

create policy "admins and hr manage planning change sets"
on public.organization_planning_change_sets
for all
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

comment on table
  public.organization_planning_change_sets
is
  'Alterações organizacionais planejadas dentro de um cenário, aplicadas posteriormente pelo Projection Engine.';

comment on column
  public.organization_planning_change_sets.change_type
is
  'Identificador estável da operação, como department.create, position.move ou employee.archive.';

comment on column
  public.organization_planning_change_sets.payload
is
  'Objeto JSON imutável quanto à identidade do ChangeSet, contendo os dados específicos da operação planejada.';

comment on column
  public.organization_planning_change_sets.version
is
  'Versão usada para controle otimista de concorrência nas alterações do ChangeSet.';
