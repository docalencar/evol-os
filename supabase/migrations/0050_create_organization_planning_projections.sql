-- PR-084B — Projection Persistence

create table if not exists public.organization_planning_projections (
  id uuid primary key,

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  workspace_id uuid not null,

  scenario_id uuid not null,

  source_snapshot_id uuid not null,

  version integer not null,

  status text not null,

  organization jsonb not null,

  metrics jsonb not null,

  warnings jsonb not null default '[]'::jsonb,

  errors jsonb not null default '[]'::jsonb,

  manifest jsonb not null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint organization_planning_projections_workspace_company_fk
    foreign key (workspace_id, company_id)
    references public.organization_planning_workspaces(id, company_id)
    on delete cascade,

  constraint organization_planning_projections_scenario_company_fk
    foreign key (scenario_id, workspace_id, company_id)
    references public.organization_planning_scenarios(
      id,
      workspace_id,
      company_id
    )
    on delete cascade,

  constraint organization_planning_projections_snapshot_company_fk
    foreign key (source_snapshot_id, workspace_id, company_id)
    references public.organization_planning_snapshots(
      id,
      workspace_id,
      company_id
    )
    on delete restrict,

  constraint organization_planning_projections_status_check
    check (
      status in (
        'generating',
        'completed',
        'published'
      )
    ),

  constraint organization_planning_projections_version_check
    check (version > 0),

  constraint organization_planning_projections_id_company_key
    unique (id, company_id)
);

create index if not exists organization_planning_projections_company_idx
on public.organization_planning_projections (
  company_id,
  created_at desc
);

create index if not exists organization_planning_projections_scenario_idx
on public.organization_planning_projections (
  scenario_id,
  created_at desc
);

create index if not exists organization_planning_projections_status_idx
on public.organization_planning_projections (
  company_id,
  status,
  created_at desc
);

create or replace function public.prevent_projection_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'PLANNING_PROJECTION_IS_IMMUTABLE';
end;
$$;

drop trigger if exists prevent_projection_mutation
on public.organization_planning_projections;

create trigger prevent_projection_mutation
before update or delete
on public.organization_planning_projections
for each row
execute function public.prevent_projection_mutation();

alter table public.organization_planning_projections
enable row level security;

create policy "members can read planning projections"
on public.organization_planning_projections
for select
using (
  public.is_company_member(company_id)
);

create policy "admins and hr create planning projections"
on public.organization_planning_projections
for insert
with check (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

comment on table public.organization_planning_projections is
'Persistência das execuções do Projection Engine.';

comment on column public.organization_planning_projections.organization is
'Snapshot completo da organização projetada.';

comment on column public.organization_planning_projections.metrics is
'Métricas calculadas pelo Projection Engine.';

comment on column public.organization_planning_projections.manifest is
'Metadados resumidos da projeção.';
