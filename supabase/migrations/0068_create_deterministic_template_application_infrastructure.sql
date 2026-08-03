-- ADR-0014 — PR 3C Phase 1: deterministic template application infrastructure

-- -----------------------------------------------------------------------------
-- Read-only preflight
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (
    select 1
    from public.development_templates template
    where template.active
      and template.created_by is null
  ) then
    raise exception using
      errcode = '23514',
      message = 'DEVELOPMENT_TEMPLATE_VERSION_PREFLIGHT_MISSING_AUTHOR';
  end if;

  if exists (
    select 1
    from public.development_templates template
    where template.active
      and not exists (
        select 1
        from public.development_template_goals goal
        where goal.template_id = template.id
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'DEVELOPMENT_TEMPLATE_VERSION_PREFLIGHT_MISSING_GOALS';
  end if;

  if exists (
    select 1
    from public.development_template_goals goal
    join public.development_templates template
      on template.id = goal.template_id
    left join public.competencies competency
      on competency.id = goal.competency_id
    left join public.global_competency_concept_versions concept_version
      on concept_version.id = goal.global_concept_version_id
    where template.active
      and (
        goal.suggested_target_level is null
        or (
          template.scope = 'company'
          and (
            goal.company_id is distinct from template.company_id
            or goal.competency_id is null
            or goal.global_concept_version_id is not null
            or competency.id is null
            or competency.company_id is distinct from template.company_id
          )
        )
        or (
          template.scope = 'global'
          and (
            goal.company_id is not null
            or goal.competency_id is not null
            or goal.global_concept_version_id is null
            or concept_version.status is distinct from 'published'
          )
        )
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'DEVELOPMENT_TEMPLATE_VERSION_PREFLIGHT_AMBIGUOUS_CONTENT';
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Versioned Development Templates
-- -----------------------------------------------------------------------------

create table public.development_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null
    references public.development_templates(id) on delete restrict,
  company_id uuid
    references public.companies(id) on delete restrict,
  scope text not null
    check (scope in ('global', 'company')),
  version_number integer not null
    check (version_number > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'obsolete')),
  name text not null
    check (btrim(name) <> ''),
  description text,
  suggested_duration_days integer
    check (suggested_duration_days is null or suggested_duration_days > 0),
  created_by uuid not null
    references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  published_by uuid
    references auth.users(id) on delete restrict,
  published_at timestamptz,
  obsoleted_by uuid
    references auth.users(id) on delete restrict,
  obsoleted_at timestamptz,
  unique (template_id, version_number),
  unique (id, company_id),
  constraint development_template_versions_scope_company_check
    check (
      (scope = 'global' and company_id is null)
      or (scope = 'company' and company_id is not null)
    ),
  constraint development_template_versions_lifecycle_check
    check (
      (
        status = 'draft'
        and published_by is null
        and published_at is null
        and obsoleted_by is null
        and obsoleted_at is null
      )
      or (
        status = 'published'
        and published_by is not null
        and published_at is not null
        and obsoleted_by is null
        and obsoleted_at is null
      )
      or (
        status = 'obsolete'
        and published_by is not null
        and published_at is not null
        and obsoleted_by is not null
        and obsoleted_at is not null
      )
    )
);

create table public.development_template_version_goals (
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null
    references public.development_template_versions(id) on delete cascade,
  source_goal_id uuid,
  company_id uuid
    references public.companies(id) on delete restrict,
  competency_id uuid,
  global_concept_version_id uuid
    references public.global_competency_concept_versions(id) on delete restrict,
  description text,
  suggested_target_level integer not null
    check (suggested_target_level between 1 and 5),
  order_index integer not null default 0
    check (order_index >= 0),
  created_at timestamptz not null default now(),
  unique (template_version_id, source_goal_id),
  unique (id, company_id),
  constraint development_template_version_goals_reference_check
    check (
      (
        company_id is null
        and competency_id is null
        and global_concept_version_id is not null
      )
      or (
        company_id is not null
        and competency_id is not null
        and global_concept_version_id is null
      )
    ),
  constraint development_template_version_goals_competency_company_fkey
    foreign key (competency_id, company_id)
    references public.competencies(id, company_id)
    on delete restrict
);

create table public.development_template_version_actions (
  id uuid primary key default gen_random_uuid(),
  template_version_goal_id uuid not null
    references public.development_template_version_goals(id) on delete cascade,
  source_action_id uuid,
  title text not null
    check (btrim(title) <> ''),
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
    check (suggested_due_days is null or suggested_due_days > 0),
  order_index integer not null default 0
    check (order_index >= 0),
  created_at timestamptz not null default now(),
  unique (template_version_goal_id, source_action_id)
);

create table public.global_competency_concept_version_compatibilities (
  id uuid primary key default gen_random_uuid(),
  required_version_id uuid not null
    references public.global_competency_concept_versions(id) on delete restrict,
  compatible_version_id uuid not null
    references public.global_competency_concept_versions(id) on delete restrict,
  declared_by uuid not null
    references auth.users(id) on delete restrict,
  reason text not null
    check (btrim(reason) <> ''),
  created_at timestamptz not null default now(),
  unique (required_version_id, compatible_version_id),
  check (required_version_id <> compatible_version_id)
);

-- -----------------------------------------------------------------------------
-- Template Application, attempts, snapshot and lineage
-- -----------------------------------------------------------------------------

create table public.development_template_applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null
    references public.companies(id) on delete restrict,
  template_version_id uuid not null
    references public.development_template_versions(id) on delete restrict,
  actor_user_id uuid not null
    references auth.users(id) on delete restrict,
  technical_principal text not null
    check (btrim(technical_principal) <> ''),
  idempotency_key text not null
    check (btrim(idempotency_key) <> ''),
  intent_fingerprint text not null
    check (btrim(intent_fingerprint) <> ''),
  correlation_id uuid not null,
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed')),
  result_plan_id uuid,
  failure_code text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  unique (company_id, idempotency_key),
  unique (id, result_plan_id, company_id),
  unique (id, result_plan_id, template_version_id, company_id),
  constraint development_template_applications_result_plan_company_fkey
    foreign key (result_plan_id, company_id)
    references public.development_plans(id, company_id)
    on delete restrict,
  constraint development_template_applications_status_result_check
    check (
      (
        status = 'pending'
        and result_plan_id is null
        and failure_code is null
        and completed_at is null
      )
      or (
        status = 'succeeded'
        and result_plan_id is not null
        and failure_code is null
        and completed_at is not null
      )
      or (
        status = 'failed'
        and result_plan_id is null
        and failure_code is not null
        and completed_at is not null
      )
    )
);

create table public.development_template_application_attempts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  company_id uuid not null,
  attempt_number integer not null
    check (attempt_number > 0),
  status text not null
    check (status in ('running', 'succeeded', 'failed', 'interrupted')),
  error_code text,
  started_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (application_id, attempt_number),
  constraint development_template_application_attempts_application_fkey
    foreign key (application_id, company_id)
    references public.development_template_applications(id, company_id)
    on delete restrict,
  constraint development_template_application_attempts_lifecycle_check
    check (
      (
        status = 'running'
        and error_code is null
        and completed_at is null
      )
      or (
        status = 'succeeded'
        and error_code is null
        and completed_at is not null
      )
      or (
        status in ('failed', 'interrupted')
        and error_code is not null
        and completed_at is not null
      )
    )
);

create table public.development_template_application_snapshots (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  company_id uuid not null,
  plan_id uuid not null,
  format_version integer not null
    check (format_version > 0),
  snapshot jsonb not null
    check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now(),
  unique (application_id, company_id),
  unique (id, company_id),
  unique (id, application_id, plan_id, company_id),
  constraint development_template_application_snapshots_application_fkey
    foreign key (application_id, plan_id, company_id)
    references public.development_template_applications(id, result_plan_id, company_id)
    on delete restrict
);

create table public.development_template_application_lineage (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null,
  snapshot_id uuid not null,
  plan_id uuid not null,
  template_version_id uuid not null,
  company_id uuid not null,
  created_at timestamptz not null default now(),
  unique (application_id, company_id),
  unique (snapshot_id, company_id),
  unique (plan_id, company_id),
  constraint development_template_application_lineage_application_fkey
    foreign key (application_id, plan_id, template_version_id, company_id)
    references public.development_template_applications(
      id,
      result_plan_id,
      template_version_id,
      company_id
    )
    on delete restrict,
  constraint development_template_application_lineage_snapshot_fkey
    foreign key (snapshot_id, application_id, plan_id, company_id)
    references public.development_template_application_snapshots(
      id,
      application_id,
      plan_id,
      company_id
    )
    on delete restrict
);

-- -----------------------------------------------------------------------------
-- Deterministic initial versions for currently consumable legacy templates
-- -----------------------------------------------------------------------------

insert into public.development_template_versions (
  template_id,
  company_id,
  scope,
  version_number,
  status,
  name,
  description,
  suggested_duration_days,
  created_by,
  created_at,
  published_by,
  published_at
)
select
  template.id,
  template.company_id,
  template.scope,
  1,
  'published',
  template.name,
  template.description,
  template.suggested_duration_days,
  template.created_by,
  template.created_at,
  template.created_by,
  template.created_at
from public.development_templates template
where template.active;

insert into public.development_template_version_goals (
  template_version_id,
  source_goal_id,
  company_id,
  competency_id,
  global_concept_version_id,
  description,
  suggested_target_level,
  order_index,
  created_at
)
select
  version.id,
  goal.id,
  goal.company_id,
  goal.competency_id,
  goal.global_concept_version_id,
  goal.description,
  goal.suggested_target_level,
  goal.order_index,
  goal.created_at
from public.development_template_goals goal
join public.development_templates template
  on template.id = goal.template_id
join public.development_template_versions version
  on version.template_id = template.id
  and version.version_number = 1
where template.active;

insert into public.development_template_version_actions (
  template_version_goal_id,
  source_action_id,
  title,
  description,
  type,
  suggested_due_days,
  order_index,
  created_at
)
select
  version_goal.id,
  action.id,
  action.title,
  action.description,
  action.type,
  action.suggested_due_days,
  action.order_index,
  action.created_at
from public.development_template_actions action
join public.development_template_version_goals version_goal
  on version_goal.source_goal_id = action.template_goal_id;

-- -----------------------------------------------------------------------------
-- Integrity triggers
-- -----------------------------------------------------------------------------

create function public.validate_development_template_version_owner()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_template_scope text;
  v_template_company_id uuid;
begin
  select template.scope, template.company_id
  into v_template_scope, v_template_company_id
  from public.development_templates template
  where template.id = new.template_id;

  if not found
    or new.scope is distinct from v_template_scope
    or new.company_id is distinct from v_template_company_id
  then
    raise exception using
      errcode = '23514',
      message = 'DEVELOPMENT_TEMPLATE_VERSION_OWNER_MISMATCH';
  end if;

  return new;
end;
$$;

create trigger validate_development_template_version_owner_trigger
before insert or update of template_id, scope, company_id
on public.development_template_versions
for each row
execute function public.validate_development_template_version_owner();

create function public.validate_development_template_version_goal_owner()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_scope text;
  v_company_id uuid;
  v_concept_status text;
begin
  select version.scope, version.company_id
  into v_scope, v_company_id
  from public.development_template_versions version
  where version.id = new.template_version_id;

  if not found or new.company_id is distinct from v_company_id then
    raise exception using
      errcode = '23514',
      message = 'DEVELOPMENT_TEMPLATE_VERSION_GOAL_OWNER_MISMATCH';
  end if;

  if v_scope = 'company' and (
    new.competency_id is null
    or new.global_concept_version_id is not null
  ) then
    raise exception using
      errcode = '23514',
      message = 'COMPANY_TEMPLATE_VERSION_GOAL_REFERENCE_INVALID';
  end if;

  if v_scope = 'global' then
    select concept_version.status
    into v_concept_status
    from public.global_competency_concept_versions concept_version
    where concept_version.id = new.global_concept_version_id;

    if new.competency_id is not null
      or new.global_concept_version_id is null
      or v_concept_status is distinct from 'published'
    then
      raise exception using
        errcode = '23514',
        message = 'GLOBAL_TEMPLATE_VERSION_GOAL_REFERENCE_INVALID';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_development_template_version_goal_owner_trigger
before insert or update of
  template_version_id,
  company_id,
  competency_id,
  global_concept_version_id
on public.development_template_version_goals
for each row
execute function public.validate_development_template_version_goal_owner();

create function public.validate_development_template_application_version()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_scope text;
  v_company_id uuid;
  v_status text;
begin
  select version.scope, version.company_id, version.status
  into v_scope, v_company_id, v_status
  from public.development_template_versions version
  where version.id = new.template_version_id;

  if not found
    or v_status <> 'published'
    or (v_scope = 'company' and v_company_id is distinct from new.company_id)
    or (v_scope = 'global' and v_company_id is not null)
  then
    raise exception using
      errcode = '23514',
      message = 'DEVELOPMENT_TEMPLATE_APPLICATION_VERSION_INVALID';
  end if;

  return new;
end;
$$;

create trigger validate_development_template_application_version_trigger
before insert or update of template_version_id, company_id
on public.development_template_applications
for each row
execute function public.validate_development_template_application_version();

create function public.protect_development_template_version()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' and old.status in ('published', 'obsolete') then
    raise exception using
      errcode = '55000',
      message = 'DEVELOPMENT_TEMPLATE_VERSION_IMMUTABLE';
  end if;

  if tg_op = 'UPDATE' and old.status in ('published', 'obsolete') then
    if old.status = 'published'
      and new.status = 'obsolete'
      and new.id = old.id
      and new.template_id = old.template_id
      and new.company_id is not distinct from old.company_id
      and new.scope = old.scope
      and new.version_number = old.version_number
      and new.name = old.name
      and new.description is not distinct from old.description
      and new.suggested_duration_days is not distinct from old.suggested_duration_days
      and new.created_by = old.created_by
      and new.created_at = old.created_at
      and new.published_by = old.published_by
      and new.published_at = old.published_at
      and new.obsoleted_by is not null
      and new.obsoleted_at is not null
    then
      return new;
    end if;

    raise exception using
      errcode = '55000',
      message = 'DEVELOPMENT_TEMPLATE_VERSION_IMMUTABLE';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger protect_development_template_version_trigger
before update or delete
on public.development_template_versions
for each row
execute function public.protect_development_template_version();

create function public.protect_development_template_version_content()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_template_version_id uuid;
  v_previous_template_version_id uuid;
  v_status text;
begin
  if tg_table_name = 'development_template_version_actions' then
    select goal.template_version_id
    into v_template_version_id
    from public.development_template_version_goals goal
    where goal.id = case
      when tg_op = 'DELETE' then old.template_version_goal_id
      else new.template_version_goal_id
    end;

    if tg_op = 'UPDATE' then
      select goal.template_version_id
      into v_previous_template_version_id
      from public.development_template_version_goals goal
      where goal.id = old.template_version_goal_id;
    end if;
  else
    v_template_version_id := case
      when tg_op = 'DELETE' then old.template_version_id
      else new.template_version_id
    end;

    if tg_op = 'UPDATE' then
      v_previous_template_version_id := old.template_version_id;
    end if;
  end if;

  select version.status
  into v_status
  from public.development_template_versions version
  where version.id = v_template_version_id;

  if v_status is distinct from 'draft' then
    raise exception using
      errcode = '55000',
      message = 'DEVELOPMENT_TEMPLATE_VERSION_CONTENT_IMMUTABLE';
  end if;

  if tg_op = 'UPDATE'
    and v_previous_template_version_id is distinct from v_template_version_id
  then
    select version.status
    into v_status
    from public.development_template_versions version
    where version.id = v_previous_template_version_id;

    if v_status is distinct from 'draft' then
      raise exception using
        errcode = '55000',
        message = 'DEVELOPMENT_TEMPLATE_VERSION_CONTENT_IMMUTABLE';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger protect_development_template_version_goal_content
before insert or update or delete
on public.development_template_version_goals
for each row
execute function public.protect_development_template_version_content();

create trigger protect_development_template_version_action_content
before insert or update or delete
on public.development_template_version_actions
for each row
execute function public.protect_development_template_version_content();

create function public.protect_development_template_application()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using
      errcode = '55000',
      message = 'DEVELOPMENT_TEMPLATE_APPLICATION_IMMUTABLE';
  end if;

  if new.id <> old.id
    or new.company_id <> old.company_id
    or new.template_version_id <> old.template_version_id
    or new.actor_user_id <> old.actor_user_id
    or new.technical_principal <> old.technical_principal
    or new.idempotency_key <> old.idempotency_key
    or new.intent_fingerprint <> old.intent_fingerprint
    or new.correlation_id <> old.correlation_id
    or new.requested_at <> old.requested_at
    or new.created_at <> old.created_at
    or old.status <> 'pending'
    or new.status not in ('succeeded', 'failed')
  then
    raise exception using
      errcode = '55000',
      message = 'DEVELOPMENT_TEMPLATE_APPLICATION_IMMUTABLE';
  end if;

  return new;
end;
$$;

create trigger protect_development_template_application_trigger
before update or delete
on public.development_template_applications
for each row
execute function public.protect_development_template_application();

create function public.protect_development_template_application_history()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'development_template_application_attempts' then
    if tg_op = 'UPDATE'
      and old.status = 'running'
      and new.status in ('succeeded', 'failed', 'interrupted')
      and new.id = old.id
      and new.application_id = old.application_id
      and new.company_id = old.company_id
      and new.attempt_number = old.attempt_number
      and new.started_at = old.started_at
      and new.created_at = old.created_at
    then
      return new;
    end if;
  end if;

  raise exception using
    errcode = '55000',
    message = 'DEVELOPMENT_TEMPLATE_APPLICATION_HISTORY_IMMUTABLE';
end;
$$;

create trigger protect_development_template_application_attempts
before update or delete
on public.development_template_application_attempts
for each row
execute function public.protect_development_template_application_history();

create trigger protect_development_template_application_snapshots
before update or delete
on public.development_template_application_snapshots
for each row
execute function public.protect_development_template_application_history();

create trigger protect_development_template_application_lineage
before update or delete
on public.development_template_application_lineage
for each row
execute function public.protect_development_template_application_history();

create trigger protect_global_competency_concept_version_compatibilities
before update or delete
on public.global_competency_concept_version_compatibilities
for each row
execute function public.protect_development_template_application_history();

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

create index development_template_versions_catalog_idx
on public.development_template_versions(scope, status, template_id, version_number desc);

create index development_template_versions_company_idx
on public.development_template_versions(company_id, status, template_id, version_number desc)
where company_id is not null;

create index development_template_version_goals_version_order_idx
on public.development_template_version_goals(template_version_id, order_index, created_at, id);

create index development_template_version_goals_competency_idx
on public.development_template_version_goals(competency_id, company_id)
where competency_id is not null;

create index development_template_version_goals_global_concept_idx
on public.development_template_version_goals(global_concept_version_id)
where global_concept_version_id is not null;

create index development_template_version_actions_goal_order_idx
on public.development_template_version_actions(
  template_version_goal_id,
  order_index,
  created_at,
  id
);

create index global_competency_concept_compatibilities_required_idx
on public.global_competency_concept_version_compatibilities(required_version_id);

create index development_template_applications_company_status_idx
on public.development_template_applications(company_id, status, requested_at desc);

create index development_template_applications_correlation_idx
on public.development_template_applications(company_id, correlation_id);

create index development_template_applications_version_idx
on public.development_template_applications(template_version_id, company_id);

create index development_template_application_attempts_application_idx
on public.development_template_application_attempts(
  application_id,
  company_id,
  attempt_number
);

create index development_template_application_snapshots_plan_idx
on public.development_template_application_snapshots(plan_id, company_id);

-- -----------------------------------------------------------------------------
-- RLS and grants: Phase 1 exposes read-only infrastructure
-- -----------------------------------------------------------------------------

alter table public.development_template_versions enable row level security;
alter table public.development_template_version_goals enable row level security;
alter table public.development_template_version_actions enable row level security;
alter table public.global_competency_concept_version_compatibilities enable row level security;
alter table public.development_template_applications enable row level security;
alter table public.development_template_application_attempts enable row level security;
alter table public.development_template_application_snapshots enable row level security;
alter table public.development_template_application_lineage enable row level security;

create policy "read published global development template versions"
on public.development_template_versions
for select to authenticated
using (scope = 'global' and status = 'published');

create policy "members read company development template versions"
on public.development_template_versions
for select to authenticated
using (
  scope = 'company'
  and company_id is not null
  and public.is_company_member(company_id)
);

create policy "read visible development template version goals"
on public.development_template_version_goals
for select to authenticated
using (
  exists (
    select 1
    from public.development_template_versions version
    where version.id = template_version_id
      and (
        (version.scope = 'global' and version.status = 'published')
        or (
          version.scope = 'company'
          and version.company_id is not null
          and public.is_company_member(version.company_id)
        )
      )
  )
);

create policy "read visible development template version actions"
on public.development_template_version_actions
for select to authenticated
using (
  exists (
    select 1
    from public.development_template_version_goals goal
    join public.development_template_versions version
      on version.id = goal.template_version_id
    where goal.id = template_version_goal_id
      and (
        (version.scope = 'global' and version.status = 'published')
        or (
          version.scope = 'company'
          and version.company_id is not null
          and public.is_company_member(version.company_id)
        )
      )
  )
);

create policy "read published concept version compatibilities"
on public.global_competency_concept_version_compatibilities
for select to authenticated
using (
  exists (
    select 1
    from public.global_competency_concept_versions required_version
    join public.global_competency_concept_versions compatible_version
      on compatible_version.id =
        global_competency_concept_version_compatibilities.compatible_version_id
    where required_version.id =
        global_competency_concept_version_compatibilities.required_version_id
      and required_version.status = 'published'
      and compatible_version.status = 'published'
  )
);

create policy "members read development template applications"
on public.development_template_applications
for select to authenticated
using (public.is_company_member(company_id));

create policy "members read development template application attempts"
on public.development_template_application_attempts
for select to authenticated
using (public.is_company_member(company_id));

create policy "members read development template application snapshots"
on public.development_template_application_snapshots
for select to authenticated
using (public.is_company_member(company_id));

create policy "members read development template application lineage"
on public.development_template_application_lineage
for select to authenticated
using (public.is_company_member(company_id));

revoke all on table
  public.development_template_versions,
  public.development_template_version_goals,
  public.development_template_version_actions,
  public.global_competency_concept_version_compatibilities,
  public.development_template_applications,
  public.development_template_application_attempts,
  public.development_template_application_snapshots,
  public.development_template_application_lineage
from public, anon, authenticated;

grant select on table
  public.development_template_versions,
  public.development_template_version_goals,
  public.development_template_version_actions,
  public.global_competency_concept_version_compatibilities,
  public.development_template_applications,
  public.development_template_application_attempts,
  public.development_template_application_snapshots,
  public.development_template_application_lineage
to authenticated;

revoke all on function public.validate_development_template_version_owner()
from public, anon, authenticated;
revoke all on function public.validate_development_template_version_goal_owner()
from public, anon, authenticated;
revoke all on function public.validate_development_template_application_version()
from public, anon, authenticated;
revoke all on function public.protect_development_template_version()
from public, anon, authenticated;
revoke all on function public.protect_development_template_version_content()
from public, anon, authenticated;
revoke all on function public.protect_development_template_application()
from public, anon, authenticated;
revoke all on function public.protect_development_template_application_history()
from public, anon, authenticated;
