-- PR-081A — Organization Planning Foundation

create table if not exists public.organization_planning_workspaces (
  id uuid primary key,
  company_id uuid not null
    references public.companies(id)
    on delete cascade,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organization_planning_workspaces_version_check
    check (version > 0),
  constraint organization_planning_workspaces_company_key
    unique (company_id),
  constraint organization_planning_workspaces_id_company_key
    unique (id, company_id)
);

create table if not exists public.organization_planning_snapshots (
  id uuid primary key,
  company_id uuid not null
    references public.companies(id)
    on delete cascade,
  workspace_id uuid not null,
  source_scenario_id uuid,
  version integer not null,
  published_at timestamptz not null,

  constraint organization_planning_snapshots_workspace_company_fk
    foreign key (workspace_id, company_id)
    references public.organization_planning_workspaces(id, company_id)
    on delete cascade,
  constraint organization_planning_snapshots_version_check
    check (version > 0),
  constraint organization_planning_snapshots_workspace_version_key
    unique (workspace_id, version),
  constraint organization_planning_snapshots_id_company_key
    unique (id, company_id),
  constraint organization_planning_snapshots_id_workspace_company_key
    unique (id, workspace_id, company_id),
  constraint organization_planning_snapshots_source_company_key
    unique (source_scenario_id, company_id)
);

create table if not exists public.organization_planning_scenarios (
  id uuid primary key,
  company_id uuid not null
    references public.companies(id)
    on delete cascade,
  workspace_id uuid not null,
  base_snapshot_id uuid not null,
  name text not null,
  description text,
  status text not null default 'draft',
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organization_planning_scenarios_workspace_company_fk
    foreign key (workspace_id, company_id)
    references public.organization_planning_workspaces(id, company_id)
    on delete cascade,
  constraint organization_planning_scenarios_base_snapshot_company_fk
    foreign key (base_snapshot_id, workspace_id, company_id)
    references public.organization_planning_snapshots(
      id,
      workspace_id,
      company_id
    )
    on delete restrict,
  constraint organization_planning_scenarios_name_check
    check (char_length(trim(name)) between 2 and 120),
  constraint organization_planning_scenarios_description_check
    check (description is null or char_length(description) <= 500),
  constraint organization_planning_scenarios_status_check
    check (
      status in (
        'draft',
        'submitted',
        'approved',
        'rejected',
        'published',
        'archived'
      )
    ),
  constraint organization_planning_scenarios_version_check
    check (version > 0),
  constraint organization_planning_scenarios_id_company_key
    unique (id, company_id),
  constraint organization_planning_scenarios_id_workspace_company_key
    unique (id, workspace_id, company_id)
);

alter table public.organization_planning_snapshots
  add constraint organization_planning_snapshots_source_scenario_company_fk
  foreign key (source_scenario_id, workspace_id, company_id)
  references public.organization_planning_scenarios(
    id,
    workspace_id,
    company_id
  )
  on delete restrict;

create index if not exists organization_planning_scenarios_company_status_idx
  on public.organization_planning_scenarios(company_id, status, updated_at desc);

create index if not exists organization_planning_snapshots_company_published_idx
  on public.organization_planning_snapshots(company_id, published_at desc);

create or replace function public.prevent_published_planning_scenario_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status = 'published' then
    raise exception 'PUBLISHED_PLANNING_SCENARIO_IS_IMMUTABLE';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_published_planning_scenario_mutation
  on public.organization_planning_scenarios;

create trigger prevent_published_planning_scenario_mutation
before update or delete on public.organization_planning_scenarios
for each row execute function public.prevent_published_planning_scenario_mutation();

create or replace function public.prevent_planning_snapshot_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'PLANNING_SNAPSHOT_IS_IMMUTABLE';
end;
$$;

drop trigger if exists prevent_planning_snapshot_mutation
  on public.organization_planning_snapshots;

create trigger prevent_planning_snapshot_mutation
before update or delete on public.organization_planning_snapshots
for each row execute function public.prevent_planning_snapshot_mutation();

alter table public.organization_planning_workspaces enable row level security;
alter table public.organization_planning_scenarios enable row level security;
alter table public.organization_planning_snapshots enable row level security;

create policy "members can read planning workspaces"
on public.organization_planning_workspaces for select
using (public.is_company_member(company_id));

create policy "admins and hr manage planning workspaces"
on public.organization_planning_workspaces for all
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']))
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));

create policy "members can read planning scenarios"
on public.organization_planning_scenarios for select
using (public.is_company_member(company_id));

create policy "admins and hr manage planning scenarios"
on public.organization_planning_scenarios for all
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']))
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));

create policy "members can read planning snapshots"
on public.organization_planning_snapshots for select
using (public.is_company_member(company_id));

create policy "admins and hr create planning snapshots"
on public.organization_planning_snapshots for insert
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));
