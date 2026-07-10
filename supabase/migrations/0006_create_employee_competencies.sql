create table if not exists public.employee_competencies (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id) on delete cascade,

  employee_id uuid not null
    references public.people(id) on delete cascade,

  competency_id uuid not null
    references public.competencies(id) on delete cascade,

  current_level integer not null default 1
    check (current_level between 1 and 5),

  validated_at timestamptz,

  source text not null default 'manual'
    check (
      source in (
        'manual',
        'assessment',
        'manager',
        'self'
      )
    ),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create unique index if not exists employee_competencies_active_unique
on public.employee_competencies (
  company_id,
  employee_id,
  competency_id
)
where archived_at is null;

create index if not exists employee_competencies_company_idx
on public.employee_competencies(company_id);

create index if not exists employee_competencies_employee_idx
on public.employee_competencies(employee_id);

create index if not exists employee_competencies_competency_idx
on public.employee_competencies(competency_id);

alter table public.employee_competencies
enable row level security;

create policy "members can read employee competencies"
on public.employee_competencies
for select
using (
  public.is_company_member(company_id)
);

create policy "admins and hr manage employee competencies"
on public.employee_competencies
for all
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);
