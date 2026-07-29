-- PR-095 — Scenario Branching Foundation

alter table public.organization_planning_scenarios
  add column if not exists parent_scenario_id uuid,
  add column if not exists branch_depth integer,
  add column if not exists branch_path text;

update public.organization_planning_scenarios
set
  branch_depth = coalesce(branch_depth, 0),
  branch_path = coalesce(branch_path, id::text)
where branch_depth is null or branch_path is null;

alter table public.organization_planning_scenarios
  alter column branch_depth set default 0,
  alter column branch_depth set not null,
  alter column branch_path set not null;

alter table public.organization_planning_scenarios
  add constraint organization_planning_scenarios_parent_workspace_company_fk
  foreign key (parent_scenario_id, workspace_id, company_id)
  references public.organization_planning_scenarios(
    id,
    workspace_id,
    company_id
  )
  on delete restrict;

alter table public.organization_planning_scenarios
  add constraint organization_planning_scenarios_branch_depth_check
  check (branch_depth >= 0),
  add constraint organization_planning_scenarios_branch_path_check
  check (char_length(trim(branch_path)) > 0),
  add constraint organization_planning_scenarios_branch_root_check
  check (
    (parent_scenario_id is null and branch_depth = 0 and branch_path = id::text)
    or
    (
      parent_scenario_id is not null
      and parent_scenario_id <> id
      and branch_depth > 0
      and cardinality(string_to_array(branch_path, '/')) = branch_depth + 1
      and split_part(branch_path, '/', branch_depth + 1) = id::text
    )
  ),
  add constraint organization_planning_scenarios_workspace_branch_path_key
  unique (workspace_id, branch_path);

create index if not exists organization_planning_scenarios_parent_idx
  on public.organization_planning_scenarios(
    company_id,
    parent_scenario_id,
    created_at
  )
  where parent_scenario_id is not null;

comment on column public.organization_planning_scenarios.parent_scenario_id is
  'Cenário imediatamente anterior na árvore; nulo apenas para cenários raiz.';

comment on column public.organization_planning_scenarios.branch_depth is
  'Profundidade determinística da branch, iniciando em zero para cenários raiz.';

comment on column public.organization_planning_scenarios.branch_path is
  'Caminho materializado e imutável da raiz até o cenário atual.';
