-- =====================================================
-- Tables
-- =====================================================

create table if not exists public.development_templates (
  id uuid primary key default gen_random_uuid(),

  company_id uuid
    references public.companies(id)
    on delete cascade,

  name text not null,

  description text,

  scope text not null
    check (
      scope in (
        'global',
        'company'
      )
    ),

  suggested_duration_days integer
    check (
      suggested_duration_days is null
      or suggested_duration_days > 0
    ),

  active boolean not null default true,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint development_templates_scope_company_check
    check (
      (
        scope = 'global'
        and company_id is null
      )
      or
      (
        scope = 'company'
        and company_id is not null
      )
    )
);

create table if not exists public.development_template_goals (
  id uuid primary key default gen_random_uuid(),

  template_id uuid not null
    references public.development_templates(id)
    on delete cascade,

  competency_id uuid
    references public.competencies(id)
    on delete set null,

  title text not null,

  description text,

  suggested_target_level integer
    check (
      suggested_target_level is null
      or suggested_target_level between 1 and 5
    ),

  order_index integer not null default 0
    check (order_index >= 0),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create table if not exists public.development_template_actions (
  id uuid primary key default gen_random_uuid(),

  template_goal_id uuid not null
    references public.development_template_goals(id)
    on delete cascade,

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

  suggested_due_days integer
    check (
      suggested_due_days is null
      or suggested_due_days > 0
    ),

  order_index integer not null default 0
    check (order_index >= 0),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

-- =====================================================
-- Indexes
-- =====================================================

create index if not exists development_templates_company_id_idx
on public.development_templates(company_id);

create index if not exists development_templates_scope_idx
on public.development_templates(scope);

create index if not exists development_templates_company_active_idx
on public.development_templates(company_id, active);

create index if not exists development_templates_global_active_idx
on public.development_templates(active)
where scope = 'global';

create index if not exists development_template_goals_template_id_idx
on public.development_template_goals(template_id);

create index if not exists development_template_goals_competency_id_idx
on public.development_template_goals(competency_id);

create index if not exists development_template_goals_order_idx
on public.development_template_goals(
  template_id,
  order_index
);

create index if not exists development_template_actions_goal_id_idx
on public.development_template_actions(template_goal_id);

create index if not exists development_template_actions_order_idx
on public.development_template_actions(
  template_goal_id,
  order_index
);
-- =====================================================
-- Row Level Security
-- =====================================================

alter table public.development_templates
enable row level security;

alter table public.development_template_goals
enable row level security;

alter table public.development_template_actions
enable row level security;

-- =====================================================
-- Policies
-- =====================================================

create policy "read global development templates"
on public.development_templates
for select
to authenticated
using (
  scope = 'global'
  and active = true
);

create policy "read company development templates"
on public.development_templates
for select
using (
  scope = 'company'
  and company_id is not null
  and public.is_company_member(company_id)
);

create policy "manage company development templates"
on public.development_templates
for all
using (
  scope = 'company'
  and company_id is not null
  and public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
)
with check (
  scope = 'company'
  and company_id is not null
  and public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

create policy "read global development template goals"
on public.development_template_goals
for select
to authenticated
using (
  exists (
    select 1
    from public.development_templates template
    where template.id = development_template_goals.template_id
      and template.scope = 'global'
      and template.active = true
  )
);

create policy "read company development template goals"
on public.development_template_goals
for select
using (
  exists (
    select 1
    from public.development_templates template
    where template.id = development_template_goals.template_id
      and template.scope = 'company'
      and template.company_id is not null
      and public.is_company_member(template.company_id)
  )
);

create policy "manage company development template goals"
on public.development_template_goals
for all
using (
  exists (
    select 1
    from public.development_templates template
    where template.id = development_template_goals.template_id
      and template.scope = 'company'
      and template.company_id is not null
      and public.has_company_role(
        template.company_id,
        array['owner', 'admin', 'hr']
      )
  )
)
with check (
  exists (
    select 1
    from public.development_templates template
    where template.id = development_template_goals.template_id
      and template.scope = 'company'
      and template.company_id is not null
      and public.has_company_role(
        template.company_id,
        array['owner', 'admin', 'hr']
      )
  )
);

create policy "read global development template actions"
on public.development_template_actions
for select
to authenticated
using (
  exists (
    select 1
    from public.development_template_goals goal
    join public.development_templates template
      on template.id = goal.template_id
    where goal.id = development_template_actions.template_goal_id
      and template.scope = 'global'
      and template.active = true
  )
);

create policy "read company development template actions"
on public.development_template_actions
for select
using (
  exists (
    select 1
    from public.development_template_goals goal
    join public.development_templates template
      on template.id = goal.template_id
    where goal.id = development_template_actions.template_goal_id
      and template.scope = 'company'
      and template.company_id is not null
      and public.is_company_member(template.company_id)
  )
);

create policy "manage company development template actions"
on public.development_template_actions
for all
using (
  exists (
    select 1
    from public.development_template_goals goal
    join public.development_templates template
      on template.id = goal.template_id
    where goal.id = development_template_actions.template_goal_id
      and template.scope = 'company'
      and template.company_id is not null
      and public.has_company_role(
        template.company_id,
        array['owner', 'admin', 'hr']
      )
  )
)
with check (
  exists (
    select 1
    from public.development_template_goals goal
    join public.development_templates template
      on template.id = goal.template_id
    where goal.id = development_template_actions.template_goal_id
      and template.scope = 'company'
      and template.company_id is not null
      and public.has_company_role(
        template.company_id,
        array['owner', 'admin', 'hr']
      )
  )
);