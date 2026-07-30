-- PR-103 — KPI Persistence & History

create extension if not exists btree_gist;

create table public.kpi_definitions (
  id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  key text not null,
  owner_module text not null,
  category text,
  created_at timestamptz not null default now(),
  primary key (company_id, id),
  constraint kpi_definitions_key_check check (char_length(btrim(key)) > 0),
  constraint kpi_definitions_owner_module_check check (char_length(btrim(owner_module)) > 0),
  constraint kpi_definitions_company_key_unique unique (company_id, key),
  constraint kpi_definitions_identity_unique unique (company_id, id, key)
);

create table public.kpi_definition_versions (
  company_id uuid not null,
  definition_id text not null,
  definition_key text not null,
  version integer not null,
  effective_from timestamptz not null,
  effective_until timestamptz,
  active boolean not null,
  name text not null,
  description text not null,
  owner_module text not null,
  category text,
  value_kind text not null,
  unit text,
  precision integer,
  favorable_direction text not null,
  thresholds jsonb not null default '[]'::jsonb,
  target numeric,
  features jsonb not null,
  created_at timestamptz not null default now(),
  primary key (company_id, definition_id, version),
  constraint kpi_definition_versions_definition_fk
    foreign key (company_id, definition_id, definition_key)
    references public.kpi_definitions(company_id, id, key) on delete restrict,
  constraint kpi_definition_versions_version_check check (version > 0),
  constraint kpi_definition_versions_period_check
    check (effective_until is null or effective_until >= effective_from),
  constraint kpi_definition_versions_value_kind_check
    check (value_kind in ('number', 'percentage', 'currency', 'duration', 'ratio')),
  constraint kpi_definition_versions_direction_check
    check (favorable_direction in ('increase', 'decrease', 'neutral')),
  constraint kpi_definition_versions_precision_check
    check (precision is null or precision >= 0),
  constraint kpi_definition_versions_thresholds_check
    check (jsonb_typeof(thresholds) = 'array'),
  constraint kpi_definition_versions_features_check
    check (jsonb_typeof(features) = 'object'),
  constraint kpi_definition_versions_company_key_version_unique
    unique (company_id, definition_key, version),
  constraint kpi_definition_versions_identity_unique
    unique (company_id, definition_id, definition_key, version),
  constraint kpi_definition_versions_period_exclusion
    exclude using gist (
      company_id with =,
      definition_key with =,
      tstzrange(effective_from, effective_until, '[)') with &&
    )
);

create table public.kpi_evaluations (
  id text not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  definition_id text not null,
  definition_key text not null,
  definition_version integer not null,
  owner_module text not null,
  scope_type text not null,
  scope_id text,
  period_start timestamptz not null,
  period_end timestamptz not null,
  evaluated_at timestamptz not null,
  requested_by text,
  correlation_id text,
  metadata jsonb not null default '{}'::jsonb,
  result jsonb not null,
  created_at timestamptz not null,
  primary key (company_id, id),
  constraint kpi_evaluations_definition_version_fk
    foreign key (company_id, definition_id, definition_key, definition_version)
    references public.kpi_definition_versions(
      company_id, definition_id, definition_key, version
    ) on delete restrict,
  constraint kpi_evaluations_scope_type_check check (
    scope_type in (
      'company', 'department', 'team', 'employee', 'position',
      'workspace', 'scenario', 'custom'
    )
  ),
  constraint kpi_evaluations_scope_id_check
    check (
      scope_type = 'company'
      or (scope_id is not null and char_length(btrim(scope_id)) > 0)
    ),
  constraint kpi_evaluations_period_check check (period_end >= period_start),
  constraint kpi_evaluations_metadata_check check (jsonb_typeof(metadata) = 'object'),
  constraint kpi_evaluations_result_check check (jsonb_typeof(result) = 'object'),
  constraint kpi_evaluations_id_company_unique unique (id, company_id)
);

create table public.kpi_evaluation_snapshots (
  evaluation_id text not null,
  company_id uuid not null,
  definition_snapshot jsonb not null,
  created_at timestamptz not null,
  primary key (company_id, evaluation_id),
  constraint kpi_evaluation_snapshots_evaluation_fk
    foreign key (evaluation_id, company_id)
    references public.kpi_evaluations(id, company_id) on delete restrict,
  constraint kpi_evaluation_snapshots_definition_check
    check (jsonb_typeof(definition_snapshot) = 'object')
);

create index kpi_definition_versions_active_lookup_idx
  on public.kpi_definition_versions(
    company_id, definition_key, active, effective_from desc
  );

create index kpi_evaluations_company_history_idx
  on public.kpi_evaluations(company_id, evaluated_at desc, id);

create index kpi_evaluations_definition_history_idx
  on public.kpi_evaluations(
    company_id, definition_key, definition_version, evaluated_at desc, id
  );

create index kpi_evaluations_scope_history_idx
  on public.kpi_evaluations(
    company_id, scope_type, scope_id, evaluated_at desc, id
  );

create or replace function public.prevent_kpi_snapshot_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'KPI_EVALUATION_SNAPSHOT_IS_IMMUTABLE';
end;
$$;

create trigger prevent_kpi_snapshot_mutation
before update or delete on public.kpi_evaluation_snapshots
for each row execute function public.prevent_kpi_snapshot_mutation();

create or replace function public.persist_kpi_definition_version(
  p_company_id uuid,
  p_definition_id text,
  p_definition_key text,
  p_version integer,
  p_effective_from timestamptz,
  p_effective_until timestamptz,
  p_active boolean,
  p_definition jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.kpi_definitions (
    id, company_id, key, owner_module, category
  ) values (
    p_definition_id,
    p_company_id,
    p_definition_key,
    p_definition->>'ownerModule',
    p_definition->>'category'
  )
  on conflict (company_id, id) do nothing;

  insert into public.kpi_definition_versions (
    company_id, definition_id, definition_key, version,
    effective_from, effective_until, active, name, description,
    owner_module, category, value_kind, unit, precision,
    favorable_direction, thresholds, target, features
  ) values (
    p_company_id,
    p_definition_id,
    p_definition_key,
    p_version,
    p_effective_from,
    p_effective_until,
    p_active,
    p_definition->>'name',
    p_definition->>'description',
    p_definition->>'ownerModule',
    p_definition->>'category',
    p_definition->>'valueKind',
    p_definition->>'unit',
    nullif(p_definition->>'precision', '')::integer,
    p_definition->>'favorableDirection',
    coalesce(p_definition->'thresholds', '[]'::jsonb),
    nullif(p_definition->>'target', '')::numeric,
    coalesce(p_definition->'features', '{}'::jsonb)
  );
end;
$$;

create or replace function public.persist_kpi_evaluation(
  p_evaluation jsonb,
  p_definition_snapshot jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.kpi_evaluations (
    id, company_id, definition_id, definition_key, definition_version,
    owner_module, scope_type, scope_id, period_start, period_end,
    evaluated_at, requested_by, correlation_id, metadata, result, created_at
  ) values (
    p_evaluation->>'id',
    (p_evaluation->>'companyId')::uuid,
    p_evaluation->>'definitionId',
    p_evaluation->>'definitionKey',
    (p_evaluation->>'definitionVersion')::integer,
    p_evaluation->>'ownerModule',
    p_evaluation->>'scopeType',
    p_evaluation->>'scopeId',
    (p_evaluation->>'periodStart')::timestamptz,
    (p_evaluation->>'periodEnd')::timestamptz,
    (p_evaluation->>'evaluatedAt')::timestamptz,
    p_evaluation->>'requestedBy',
    p_evaluation->>'correlationId',
    coalesce(p_evaluation->'metadata', '{}'::jsonb),
    p_evaluation->'result',
    (p_evaluation->>'createdAt')::timestamptz
  );

  insert into public.kpi_evaluation_snapshots (
    evaluation_id, company_id, definition_snapshot, created_at
  ) values (
    p_evaluation->>'id',
    (p_evaluation->>'companyId')::uuid,
    p_definition_snapshot,
    (p_evaluation->>'createdAt')::timestamptz
  );
end;
$$;

revoke all on function public.persist_kpi_definition_version(
  uuid, text, text, integer, timestamptz, timestamptz, boolean, jsonb
) from public;
revoke all on function public.persist_kpi_evaluation(jsonb, jsonb) from public;

grant execute on function public.persist_kpi_definition_version(
  uuid, text, text, integer, timestamptz, timestamptz, boolean, jsonb
) to authenticated;
grant execute on function public.persist_kpi_evaluation(jsonb, jsonb) to authenticated;

alter table public.kpi_definitions enable row level security;
alter table public.kpi_definition_versions enable row level security;
alter table public.kpi_evaluations enable row level security;
alter table public.kpi_evaluation_snapshots enable row level security;

create policy "members can read kpi definitions"
on public.kpi_definitions for select
using (public.is_company_member(company_id));

create policy "admins and hr manage kpi definitions"
on public.kpi_definitions for all
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']))
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));

create policy "members can read kpi definition versions"
on public.kpi_definition_versions for select
using (public.is_company_member(company_id));

create policy "admins and hr manage kpi definition versions"
on public.kpi_definition_versions for all
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']))
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));

create policy "members can read kpi evaluations"
on public.kpi_evaluations for select
using (public.is_company_member(company_id));

create policy "admins and hr create kpi evaluations"
on public.kpi_evaluations for insert
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));

create policy "members can read kpi evaluation snapshots"
on public.kpi_evaluation_snapshots for select
using (public.is_company_member(company_id));

create policy "admins and hr create kpi evaluation snapshots"
on public.kpi_evaluation_snapshots for insert
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));

comment on table public.kpi_evaluation_snapshots is
  'Snapshot imutável e serializável da definição utilizada em cada avaliação.';
