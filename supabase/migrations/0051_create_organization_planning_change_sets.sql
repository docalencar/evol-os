-- PR-087D — Canonical Change Set Persistence

create table if not exists public.organization_planning_change_sets (
  id uuid primary key,
  company_id uuid not null
    references public.companies(id)
    on delete cascade,
  scenario_id uuid not null,
  change_type text not null,
  payload jsonb not null,
  version integer not null,
  active boolean not null default true,
  superseded_by uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organization_planning_change_sets_scenario_company_fk
    foreign key (scenario_id, company_id)
    references public.organization_planning_scenarios(id, company_id)
    on delete cascade,
  constraint organization_planning_change_sets_change_type_check
    check (char_length(trim(change_type)) > 0),
  constraint organization_planning_change_sets_payload_check
    check (jsonb_typeof(payload) = 'object'),
  constraint organization_planning_change_sets_version_check
    check (version > 0),
  constraint organization_planning_change_sets_lifecycle_check
    check (
      (active and archived_at is null and superseded_by is null)
      or not active
    ),
  constraint organization_planning_change_sets_id_company_key
    unique (id, company_id),
  constraint organization_planning_change_sets_id_scenario_company_key
    unique (id, scenario_id, company_id)
);

alter table public.organization_planning_change_sets
  add constraint organization_planning_change_sets_superseded_by_fk
  foreign key (superseded_by, scenario_id, company_id)
  references public.organization_planning_change_sets(
    id,
    scenario_id,
    company_id
  )
  on delete restrict;

create index if not exists organization_planning_change_sets_publishable_idx
  on public.organization_planning_change_sets(
    company_id,
    scenario_id,
    version,
    id
  )
  where active and archived_at is null and superseded_by is null;

alter table public.organization_planning_change_sets
  enable row level security;

create policy "members can read planning change sets"
on public.organization_planning_change_sets for select
using (public.is_company_member(company_id));

create policy "admins and hr manage planning change sets"
on public.organization_planning_change_sets for all
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']))
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));

comment on table public.organization_planning_change_sets is
  'Fonte canônica server-side das mudanças pertencentes a cenários de planejamento.';

comment on column public.organization_planning_change_sets.active is
  'Somente registros ativos, não arquivados e não substituídos são elegíveis para publicação.';
