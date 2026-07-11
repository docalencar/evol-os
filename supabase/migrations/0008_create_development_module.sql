create table if not exists public.development_plans (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id) on delete cascade,

  employee_id uuid not null
    references public.people(id) on delete restrict,

  created_by uuid not null
    references auth.users(id) on delete restrict,

  owner_id uuid
    references public.people(id) on delete restrict,

  title text not null,

  description text,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'active',
        'completed',
        'cancelled'
      )
    ),

  priority text not null default 'medium'
    check (
      priority in (
        'low',
        'medium',
        'high'
      )
    ),

  start_date date,

  due_date date,

  completed_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create table if not exists public.development_goals (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id) on delete cascade,

  plan_id uuid not null
    references public.development_plans(id) on delete cascade,

  competency_id uuid not null
    references public.competencies(id) on delete restrict,

  title text not null,

  description text,

  current_level integer not null
    check (current_level between 0 and 5),

  expected_level integer not null
    check (expected_level between 1 and 5),

  target_level integer not null
    check (target_level between 1 and 5),

  status text not null default 'not_started'
    check (
      status in (
        'not_started',
        'in_progress',
        'completed'
      )
    ),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint development_goals_target_not_below_current_check
  check (target_level >= current_level)
);

create table if not exists public.development_actions (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id) on delete cascade,

  goal_id uuid not null
    references public.development_goals(id) on delete cascade,

  title text not null,

  description text,

  type text not null
    check (
      type in (
        'course',
        'book',
        'mentoring',
        'shadowing',
        'project',
        'workshop',
        'feedback',
        'other'
      )
    ),

  status text not null default 'pending'
    check (
      status in (
        'pending',
        'in_progress',
        'completed',
        'skipped'
      )
    ),

  due_date date,

  completed_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists development_plans_company_id_idx
on public.development_plans(company_id);

create index if not exists development_plans_employee_id_idx
on public.development_plans(employee_id);

create index if not exists development_plans_owner_id_idx
on public.development_plans(owner_id);

create index if not exists development_plans_status_idx
on public.development_plans(company_id, status);

create index if not exists development_goals_company_id_idx
on public.development_goals(company_id);

create index if not exists development_goals_plan_id_idx
on public.development_goals(plan_id);

create index if not exists development_goals_competency_id_idx
on public.development_goals(competency_id);

create index if not exists development_actions_company_id_idx
on public.development_actions(company_id);

create index if not exists development_actions_goal_id_idx
on public.development_actions(goal_id);

create index if not exists development_actions_status_idx
on public.development_actions(company_id, status);

alter table public.development_plans
enable row level security;

alter table public.development_goals
enable row level security;

alter table public.development_actions
enable row level security;

create policy "members can read development plans"
on public.development_plans
for select
using (
  public.is_company_member(company_id)
);

create policy "admins and hr manage development plans"
on public.development_plans
for all
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

create policy "members can read development goals"
on public.development_goals
for select
using (
  public.is_company_member(company_id)
);

create policy "admins and hr manage development goals"
on public.development_goals
for all
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

create policy "members can read development actions"
on public.development_actions
for select
using (
  public.is_company_member(company_id)
);

create policy "admins and hr manage development actions"
on public.development_actions
for all
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);
