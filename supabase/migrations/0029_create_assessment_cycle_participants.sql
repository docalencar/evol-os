create table if not exists public.assessment_cycle_participants (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  assessment_cycle_id uuid not null
    references public.assessment_cycles(id)
    on delete cascade,

  employee_id uuid not null
    references public.people(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  unique (
    assessment_cycle_id,
    employee_id
  )
);

create index if not exists
assessment_cycle_participants_cycle_idx
on public.assessment_cycle_participants(
  assessment_cycle_id
);

create index if not exists
assessment_cycle_participants_employee_idx
on public.assessment_cycle_participants(
  employee_id
);

create index if not exists
assessment_cycle_participants_company_idx
on public.assessment_cycle_participants(
  company_id
);

alter table public.assessment_cycle_participants
  enable row level security;

drop policy if exists
  "members can read assessment cycle participants"
  on public.assessment_cycle_participants;

drop policy if exists
  "admins and hr manage assessment cycle participants"
  on public.assessment_cycle_participants;

create policy "members can read assessment cycle participants"
on public.assessment_cycle_participants
for select
using (
  public.is_company_member(company_id)
);

create policy "admins and hr manage assessment cycle participants"
on public.assessment_cycle_participants
for all
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
)
with check (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

notify pgrst, 'reload schema';
