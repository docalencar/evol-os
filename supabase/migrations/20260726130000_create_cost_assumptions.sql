create table if not exists public.cost_assumptions (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null,

  average_employee_monthly_cost numeric not null default 0,
  average_hiring_cost numeric not null default 0,
  average_termination_cost numeric not null default 0,

  currency text not null default 'BRL',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cost_assumptions_company_unique
    unique(company_id),

  constraint cost_assumptions_values_positive
    check (
      average_employee_monthly_cost >= 0
      and average_hiring_cost >= 0
      and average_termination_cost >= 0
    )
);


create index if not exists
  cost_assumptions_company_idx
on public.cost_assumptions(company_id);


alter table public.cost_assumptions
enable row level security;


create policy "Company members can view cost assumptions"
on public.cost_assumptions
for select
using (
  public.is_company_member(company_id)
);


create policy "Company members can insert cost assumptions"
on public.cost_assumptions
for insert
with check (
  public.is_company_member(company_id)
);


create policy "Company members can update cost assumptions"
on public.cost_assumptions
for update
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);
