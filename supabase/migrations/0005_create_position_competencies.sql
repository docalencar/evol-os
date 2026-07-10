create table if not exists public.position_competencies (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id) on delete cascade,

  position_id uuid not null
    references public.positions(id) on delete cascade,

  competency_id uuid not null
    references public.competencies(id) on delete cascade,

  expected_level integer not null default 3
    check (expected_level between 1 and 5),

  weight integer not null default 1
    check (weight between 1 and 5),

  required boolean not null default true,

  type text not null default 'core'
    check (
      type in (
        'core',
        'leadership',
        'promotion',
        'optional'
      )
    ),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create unique index if not exists position_competencies_active_unique
on public.position_competencies (
  company_id,
  position_id,
  competency_id
)
where archived_at is null;

create index if not exists position_competencies_company_id_idx
on public.position_competencies (company_id);

create index if not exists position_competencies_position_id_idx
on public.position_competencies (position_id);

create index if not exists position_competencies_competency_id_idx
on public.position_competencies (competency_id);

alter table public.position_competencies
enable row level security;

create policy "members can read position competencies"
on public.position_competencies
for select
using (
  public.is_company_member(company_id)
);

create policy "admins and hr manage position competencies"
on public.position_competencies
for all
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);
