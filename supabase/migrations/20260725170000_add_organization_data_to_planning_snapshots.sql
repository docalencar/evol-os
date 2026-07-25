alter table public.organization_planning_snapshots
  add column if not exists organization_data jsonb;

comment on column public.organization_planning_snapshots.organization_data is
  'Conteúdo organizacional imutável do snapshot publicado, no formato OrganizationSnapshot.';

alter table public.organization_planning_snapshots
  add constraint organization_planning_snapshots_organization_data_object_check
  check (
    organization_data is null
    or jsonb_typeof(organization_data) = 'object'
  );

create index if not exists
  organization_planning_snapshots_schema_version_idx
on public.organization_planning_snapshots (
  ((organization_data ->> 'schemaVersion')::integer)
)
where organization_data is not null;
