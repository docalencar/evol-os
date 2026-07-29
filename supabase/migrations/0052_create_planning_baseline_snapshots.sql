-- PR-087F — Baseline Snapshot Bootstrap

alter table public.organization_planning_snapshots
  add column if not exists kind text null;

alter table public.organization_planning_snapshots
  add constraint organization_planning_snapshots_kind_check
  check (kind is null or kind in ('baseline', 'projection'));

alter table public.organization_planning_snapshots
  add constraint organization_planning_snapshots_kind_invariants_check
  check (
    kind is null
    or (
      kind = 'baseline'
      and version = 1
      and source_scenario_id is null
      and organization is not null
    )
    or (
      kind = 'projection'
      and version > 1
      and source_scenario_id is not null
      and organization is not null
    )
  );

create unique index if not exists organization_planning_snapshots_baseline_key
  on public.organization_planning_snapshots(workspace_id)
  where kind = 'baseline';

create or replace function public.classify_new_planning_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind is null then
    if new.source_scenario_id is not null
      and new.organization is not null then
      new.kind := 'projection';
    else
      raise exception 'PLANNING_SNAPSHOT_KIND_IS_REQUIRED';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists classify_new_planning_snapshot
  on public.organization_planning_snapshots;

create trigger classify_new_planning_snapshot
before insert on public.organization_planning_snapshots
for each row execute function public.classify_new_planning_snapshot();

create or replace function public.bootstrap_planning_workspace(
  p_company_id uuid,
  p_workspace_id uuid,
  p_snapshot_id uuid,
  p_created_at timestamptz,
  p_organization jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_created_at is null then
    raise exception 'PLANNING_BASELINE_CREATED_AT_IS_REQUIRED';
  end if;

  if p_organization is null
    or jsonb_typeof(p_organization) <> 'object' then
    raise exception 'PLANNING_BASELINE_ORGANIZATION_IS_REQUIRED';
  end if;

  if exists (
    select 1
    from public.organization_planning_snapshots as snapshot
    where snapshot.company_id = p_company_id
      and snapshot.kind = 'baseline'
  ) then
    raise exception 'PLANNING_BASELINE_ALREADY_EXISTS';
  end if;

  insert into public.organization_planning_workspaces (
    id,
    company_id,
    version,
    created_at,
    updated_at
  ) values (
    p_workspace_id,
    p_company_id,
    1,
    p_created_at,
    p_created_at
  );

  insert into public.organization_planning_snapshots (
    id,
    company_id,
    workspace_id,
    source_scenario_id,
    version,
    published_at,
    organization,
    kind
  ) values (
    p_snapshot_id,
    p_company_id,
    p_workspace_id,
    null,
    1,
    p_created_at,
    p_organization,
    'baseline'
  );
end;
$$;

revoke all on function public.bootstrap_planning_workspace(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb
) from public;

grant execute on function public.bootstrap_planning_workspace(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb
) to authenticated;

comment on column public.organization_planning_snapshots.kind is
  'baseline identifica a raiz organizacional; projection identifica snapshots derivados; null é reservado a legado.';

comment on function public.bootstrap_planning_workspace(
  uuid,
  uuid,
  uuid,
  timestamptz,
  jsonb
) is
  'Cria Workspace e Baseline Snapshot com a organização operacional em uma única transação.';
