create table if not exists public.organization_units (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  parent_id uuid
    references public.organization_units(id)
    on delete set null,

  name text not null,

  type text not null default 'business_unit',

  status text not null default 'active',

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  deleted_at timestamptz,

  constraint organization_units_type_check
  check (
    type in (
      'holding',
      'business_unit'
    )
  ),

  constraint organization_units_status_check
  check (
    status in (
      'active',
      'inactive'
    )
  )
);


create index if not exists organization_units_company_idx
on public.organization_units(company_id)
where deleted_at is null;


create index if not exists organization_units_parent_idx
on public.organization_units(parent_id)
where deleted_at is null;


create index if not exists organization_units_type_idx
on public.organization_units(type);


comment on table public.organization_units is
'Unidades organizacionais da empresa, como holding, filiais ou unidades de negócio.';