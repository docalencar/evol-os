-- D-DB1: private Development lifecycle foundation and trusted operational boundary.
--
-- D-P0 makes a PDI participant-private. This migration establishes the durable
-- review and audit records, purpose-scoped reads, and purpose-bound mutations.
-- Direct authenticated table access remains closed. Goal status is a derived
-- cache whose sole factual source is the action set; trusted action transitions
-- synchronize it atomically and reads derive it again fail-safe.

-- ---------------------------------------------------------------------------
-- Fail-closed preflight.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.development_reviews') is not null
    or to_regclass('public.development_private_audit') is not null
  then
    raise exception using errcode = '42710', message = 'DEVELOPMENT_LIFECYCLE_TABLE_PREFLIGHT_FAILED';
  end if;

  if exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in (
        'get_authorized_development_plans_v1',
        'get_authorized_development_goals_v1',
        'get_authorized_development_actions_v1',
        'get_authorized_development_reviews_v1',
        'create_development_plan_v1',
        'update_development_plan_v1',
        'reassign_development_plan_owner_v1',
        'activate_development_plan_v1',
        'cancel_development_plan_v1',
        'complete_development_plan_v1',
        'start_development_action_v1',
        'complete_development_action_v1',
        'skip_development_action_v1',
        'record_development_review_v1'
      )
  ) then
    raise exception using errcode = '42710', message = 'DEVELOPMENT_LIFECYCLE_FUNCTION_PREFLIGHT_FAILED';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Schema.
-- ---------------------------------------------------------------------------
alter table public.development_plans
  add column version bigint not null default 1 check (version > 0),
  add column creation_idempotency_key uuid,
  add column creation_fingerprint text;

alter table public.development_plans
  add constraint development_plans_creation_idempotency_shape_check
  check (
    (creation_idempotency_key is null and creation_fingerprint is null)
    or (creation_idempotency_key is not null and nullif(btrim(creation_fingerprint), '') is not null)
  );

create unique index development_plans_company_creation_idempotency_key
  on public.development_plans(company_id, creation_idempotency_key)
  where creation_idempotency_key is not null;

create table public.development_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  development_plan_id uuid not null,
  reviewer_id uuid not null,
  type text not null check (type in ('periodic', 'final')),
  reviewed_at timestamptz not null default clock_timestamp(),
  summary text not null check (char_length(btrim(summary)) between 1 and 4000),
  next_step text,
  action_transition_watermark bigint not null check (action_transition_watermark >= 0),
  idempotency_key uuid not null,
  intent_fingerprint text not null check (btrim(intent_fingerprint) <> ''),
  created_at timestamptz not null default clock_timestamp(),
  unique (id, company_id),
  unique (company_id, idempotency_key),
  constraint development_reviews_next_step_check
    check (
      (type = 'periodic' and char_length(btrim(next_step)) between 1 and 2000)
      or (type = 'final' and (next_step is null or char_length(btrim(next_step)) between 1 and 2000))
    ),
  constraint development_reviews_plan_company_fkey
    foreign key (development_plan_id, company_id)
    references public.development_plans(id, company_id)
    on delete cascade,
  constraint development_reviews_reviewer_company_fkey
    foreign key (reviewer_id, company_id)
    references public.people(id, company_id)
    on delete restrict
);

create index development_reviews_plan_history_idx
  on public.development_reviews(company_id, development_plan_id, reviewed_at, id);

create table public.development_private_audit (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null check (btrim(event_type) <> ''),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  actor_person_id uuid references public.people(id) on delete restrict,
  entity_type text not null check (entity_type in ('development_plan', 'development_goal', 'development_action', 'development_review', 'development_template_version', 'development_template_goal', 'development_template_action')),
  entity_id uuid not null,
  from_state text,
  to_state text,
  reason text check (reason is null or char_length(btrim(reason)) between 1 and 500),
  correlation_id uuid,
  idempotency_key uuid,
  occurred_at timestamptz not null default clock_timestamp(),
  constraint development_private_audit_actor_company_fkey
    foreign key (actor_person_id, company_id)
    references public.people(id, company_id)
    on delete restrict
);

create index development_private_audit_company_entity_idx
  on public.development_private_audit(company_id, entity_type, entity_id, id);
create index development_private_audit_company_event_idx
  on public.development_private_audit(company_id, event_type, id);

alter table public.development_reviews enable row level security;
alter table public.development_private_audit enable row level security;

revoke all on table public.development_reviews, public.development_private_audit
from public, anon, authenticated;
grant select on table public.development_reviews, public.development_private_audit
to service_role;

-- ---------------------------------------------------------------------------
-- Internal authorization, audit and derivation helpers.
-- ---------------------------------------------------------------------------
create function public.development_actor_person_id_v1(p_company_id uuid)
returns uuid
language sql stable security definer
set search_path = public, pg_temp
as $$
  select person.id
  from public.company_members membership
  join public.people person
    on person.company_id = membership.company_id
   and person.user_id = membership.user_id
   and person.status = 'active'
  where membership.company_id = p_company_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
  order by person.id
  limit 1;
$$;

create function public.development_actor_is_admin_v1(p_company_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.company_members membership
    where membership.company_id = p_company_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'hr')
  );
$$;

create function public.can_read_development_plan_v1(p_plan_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.development_plans plan
    join public.company_members membership
      on membership.company_id = plan.company_id
     and membership.user_id = auth.uid()
     and membership.status = 'active'
    left join public.people actor
      on actor.company_id = plan.company_id
     and actor.user_id = auth.uid()
     and actor.status = 'active'
    join public.people subject
      on subject.id = plan.employee_id and subject.company_id = plan.company_id
    left join public.people responsible
      on responsible.id = plan.owner_id and responsible.company_id = plan.company_id
    where plan.id = p_plan_id
      and (
        membership.role in ('owner', 'admin', 'hr')
        or actor.id = plan.employee_id
        or (actor.id = plan.owner_id and responsible.status = 'active')
        or (subject.status <> 'terminated' and subject.manager_id = actor.id)
      )
  );
$$;

create function public.can_manage_development_plan_v1(p_plan_id uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.development_plans plan
    join public.company_members membership
      on membership.company_id = plan.company_id
     and membership.user_id = auth.uid()
     and membership.status = 'active'
    left join public.people actor
      on actor.company_id = plan.company_id
     and actor.user_id = auth.uid()
     and actor.status = 'active'
    join public.people subject
      on subject.id = plan.employee_id and subject.company_id = plan.company_id
    left join public.people responsible
      on responsible.id = plan.owner_id and responsible.company_id = plan.company_id
    where plan.id = p_plan_id
      and (
        membership.role in ('owner', 'admin', 'hr')
        or (actor.id = plan.owner_id and responsible.status = 'active')
        or (subject.status <> 'terminated' and subject.manager_id = actor.id)
      )
  );
$$;

create function public.append_development_private_audit_v1(
  p_company_id uuid,
  p_event_type text,
  p_actor_person_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_from_state text default null,
  p_to_state text default null,
  p_reason text default null,
  p_correlation_id uuid default null,
  p_idempotency_key uuid default null
) returns bigint
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  insert into public.development_private_audit (
    company_id, event_type, actor_user_id, actor_person_id, entity_type,
    entity_id, from_state, to_state, reason, correlation_id, idempotency_key
  ) values (
    p_company_id, p_event_type, auth.uid(), p_actor_person_id, p_entity_type,
    p_entity_id, p_from_state, p_to_state, nullif(btrim(p_reason), ''),
    p_correlation_id, p_idempotency_key
  ) returning id into v_id;
  return v_id;
end;
$$;

create function public.synchronize_development_goal_status_v1(p_goal_id uuid)
returns text
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
begin
  select case
    when count(action.id) = 0 then 'not_started'
    when bool_and(action.status = 'pending') then 'not_started'
    when bool_and(action.status in ('completed', 'skipped')) then 'completed'
    else 'in_progress'
  end
  into v_status
  from public.development_actions action
  where action.goal_id = p_goal_id;

  update public.development_goals
  set status = v_status, updated_at = clock_timestamp()
  where id = p_goal_id and status is distinct from v_status;
  return v_status;
end;
$$;

create function public.protect_development_append_only_v1()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  raise exception using errcode = '55000', message = 'DEVELOPMENT_APPEND_ONLY_RECORD';
end;
$$;

create trigger protect_development_reviews_append_only
before update or delete on public.development_reviews
for each row execute function public.protect_development_append_only_v1();
create trigger protect_development_private_audit_append_only
before update or delete on public.development_private_audit
for each row execute function public.protect_development_append_only_v1();

-- Existing goal values become a derived cache before the new boundary opens.
update public.development_goals goal
set status = derived.status, updated_at = clock_timestamp()
from (
  select g.id, case
    when count(a.id) = 0 then 'not_started'
    when bool_and(a.status = 'pending') then 'not_started'
    when bool_and(a.status in ('completed', 'skipped')) then 'completed'
    else 'in_progress'
  end as status
  from public.development_goals g
  left join public.development_actions a on a.goal_id = g.id and a.company_id = g.company_id
  group by g.id
) derived
where goal.id = derived.id and goal.status is distinct from derived.status;

-- ---------------------------------------------------------------------------
-- Purpose-scoped reads. Lists and detail selectors share the same row-level
-- authorization predicate; inaccessible and nonexistent selectors both return
-- an empty set.
-- ---------------------------------------------------------------------------
create function public.get_authorized_development_plans_v1(
  p_company_id uuid,
  p_plan_id uuid default null
) returns table (
  plan_id uuid, employee_id uuid, owner_id uuid, template_id uuid,
  title text, description text, status text, priority text,
  start_date date, due_date date, completed_at timestamptz,
  version bigint, total_actions bigint, completed_actions bigint,
  skipped_actions bigint, progress_percent integer,
  created_at timestamptz, updated_at timestamptz
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if not public.is_company_member(p_company_id) then
    raise exception using errcode = '42501', message = 'TENANT_AUTHORIZATION_DENIED';
  end if;

  return query
  select plan.id, plan.employee_id, plan.owner_id, plan.template_id,
    plan.title, plan.description, plan.status, plan.priority,
    plan.start_date, plan.due_date, plan.completed_at, plan.version,
    count(action.id)::bigint,
    count(action.id) filter (where action.status = 'completed')::bigint,
    count(action.id) filter (where action.status = 'skipped')::bigint,
    case when count(action.id) = 0 then 0 else floor(
      100.0 * count(action.id) filter (where action.status in ('completed', 'skipped'))
      / count(action.id)
    )::integer end,
    plan.created_at, plan.updated_at
  from public.development_plans plan
  left join public.development_goals goal
    on goal.plan_id = plan.id and goal.company_id = plan.company_id
  left join public.development_actions action
    on action.goal_id = goal.id and action.company_id = goal.company_id
  where plan.company_id = p_company_id
    and (p_plan_id is null or plan.id = p_plan_id)
    and public.can_read_development_plan_v1(plan.id)
  group by plan.id
  order by plan.created_at desc, plan.id;
end;
$$;

create function public.get_authorized_development_goals_v1(
  p_company_id uuid,
  p_plan_id uuid default null
) returns table (
  goal_id uuid, plan_id uuid, competency_id uuid, title text,
  description text, current_level integer, expected_level integer,
  target_level integer, status text, created_at timestamptz, updated_at timestamptz
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception using errcode='42501', message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501', message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query
  select goal.id, goal.plan_id, goal.competency_id, goal.title, goal.description,
    goal.current_level, goal.expected_level, goal.target_level,
    case
      when count(action.id) = 0 then 'not_started'
      when bool_and(action.status = 'pending') then 'not_started'
      when bool_and(action.status in ('completed', 'skipped')) then 'completed'
      else 'in_progress'
    end,
    goal.created_at, goal.updated_at
  from public.development_goals goal
  join public.development_plans plan
    on plan.id = goal.plan_id and plan.company_id = goal.company_id
  left join public.development_actions action
    on action.goal_id = goal.id and action.company_id = goal.company_id
  where goal.company_id = p_company_id
    and (p_plan_id is null or goal.plan_id = p_plan_id)
    and public.can_read_development_plan_v1(plan.id)
  group by goal.id
  order by goal.created_at, goal.id;
end;
$$;

create function public.get_authorized_development_actions_v1(
  p_company_id uuid,
  p_plan_id uuid default null
) returns table (
  action_id uuid, goal_id uuid, plan_id uuid, title text, description text,
  action_type text, status text, due_date date, completed_at timestamptz,
  created_at timestamptz, updated_at timestamptz
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception using errcode='42501', message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501', message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query
  select action.id, action.goal_id, goal.plan_id, action.title,
    action.description, action.type, action.status, action.due_date,
    action.completed_at, action.created_at, action.updated_at
  from public.development_actions action
  join public.development_goals goal
    on goal.id = action.goal_id and goal.company_id = action.company_id
  join public.development_plans plan
    on plan.id = goal.plan_id and plan.company_id = goal.company_id
  where action.company_id = p_company_id
    and (p_plan_id is null or goal.plan_id = p_plan_id)
    and public.can_read_development_plan_v1(plan.id)
  order by action.created_at, action.id;
end;
$$;

create function public.get_authorized_development_reviews_v1(
  p_company_id uuid,
  p_plan_id uuid
) returns table (
  review_id uuid, development_plan_id uuid, reviewer_id uuid, review_type text,
  reviewed_at timestamptz, summary text, next_step text, created_at timestamptz
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception using errcode='42501', message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501', message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query
  select review.id, review.development_plan_id, review.reviewer_id, review.type,
    review.reviewed_at, review.summary, review.next_step, review.created_at
  from public.development_reviews review
  where review.company_id = p_company_id
    and review.development_plan_id = p_plan_id
    and public.can_read_development_plan_v1(review.development_plan_id)
  order by review.reviewed_at, review.id;
end;
$$;

-- Privacy hardening of the dashboard projection used by /app and Development.
create or replace function public.get_tenant_development_dashboard_v1(p_company_id uuid)
returns table(record_type text, record_id uuid, parent_id uuid, employee_id uuid,
  owner_id uuid, template_id uuid, competency_id uuid, label text, status text,
  priority text, action_type text, current_level integer, expected_level integer,
  target_level integer, start_date date, due_date date, completed_at timestamptz,
  scope text, suggested_duration_days integer)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  return query
  select * from (
    select 'plan'::text,p.id,null::uuid,p.employee_id,p.owner_id,p.template_id,null::uuid,p.title,p.status,p.priority,null::text,null::integer,null::integer,null::integer,p.start_date,p.due_date,p.completed_at,null::text,null::integer
      from public.development_plans p where p.company_id=p_company_id and public.can_read_development_plan_v1(p.id)
    union all
    select 'goal',g.id,g.plan_id,null,null,null,g.competency_id,g.title,
      case when count(a.id)=0 then 'not_started' when bool_and(a.status='pending') then 'not_started' when bool_and(a.status in ('completed','skipped')) then 'completed' else 'in_progress' end,
      null,null,g.current_level,g.expected_level,g.target_level,null,null,null,null,null
      from public.development_goals g
      left join public.development_actions a on a.goal_id=g.id and a.company_id=g.company_id
      where g.company_id=p_company_id and public.can_read_development_plan_v1(g.plan_id)
      group by g.id
    union all
    select 'action',a.id,a.goal_id,null,null,null,null,a.title,a.status,null,a.type,null,null,null,null,a.due_date,a.completed_at,null,null
      from public.development_actions a join public.development_goals g on g.id=a.goal_id and g.company_id=a.company_id
      where a.company_id=p_company_id and public.can_read_development_plan_v1(g.plan_id)
    union all
    select 'template',t.id,null,null,null,null,null,t.name,v.status,null,null,null,null,null,null,null,null,t.scope,t.suggested_duration_days
      from public.development_templates t
      join lateral (
        select version.status from public.development_template_versions version
        where version.template_id=t.id and version.status='published'
        order by version.version_number desc limit 1
      ) v on true
      where t.scope='global' or (t.scope='company' and t.company_id=p_company_id)
  ) as d(record_type,record_id,parent_id,employee_id,owner_id,template_id,competency_id,label,status,priority,action_type,current_level,expected_level,target_level,start_date,due_date,completed_at,scope,suggested_duration_days)
  order by d.record_type,d.label,d.record_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Trusted plan mutations.
-- ---------------------------------------------------------------------------
create function public.create_development_plan_v1(
  p_employee_id uuid,
  p_owner_id uuid,
  p_title text,
  p_description text,
  p_priority text,
  p_start_date date,
  p_due_date date,
  p_idempotency_key uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_actor_person_id uuid;
  v_actor_role text;
  v_owner_id uuid;
  v_title text := btrim(p_title);
  v_description text := nullif(btrim(p_description), '');
  v_fingerprint text;
  v_existing public.development_plans%rowtype;
  v_plan_id uuid;
begin
  if v_user_id is null then raise exception using errcode='42501', message='AUTHENTICATION_REQUIRED'; end if;
  if v_title is null or char_length(v_title) not between 3 and 120
    or v_description is not null and char_length(v_description) > 1000
    or p_priority not in ('low','medium','high')
    or p_start_date is not null and p_due_date is not null and p_due_date < p_start_date
    or p_idempotency_key is null
  then raise exception using errcode='22023', message='DEVELOPMENT_INPUT_INVALID'; end if;

  select person.company_id, person.id, membership.role
  into v_company_id, v_actor_person_id, v_actor_role
  from public.people person
  join public.company_members membership
    on membership.company_id=person.company_id and membership.user_id=v_user_id and membership.status='active'
  where person.user_id=v_user_id and person.status='active'
    and exists (
      select 1 from public.people subject
      where subject.id=p_employee_id and subject.company_id=person.company_id and subject.status in ('active','on_leave')
    )
  order by person.id limit 1;

  if v_company_id is null then raise exception using errcode='P0002', message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;

  if v_actor_role = 'manager' then
    if not exists (select 1 from public.people subject where subject.id=p_employee_id and subject.company_id=v_company_id and subject.manager_id=v_actor_person_id) then
      raise exception using errcode='P0002', message='DEVELOPMENT_RESOURCE_UNAVAILABLE';
    end if;
    v_owner_id := v_actor_person_id;
  elsif v_actor_role in ('owner','admin','hr') then
    v_owner_id := p_owner_id;
  else
    raise exception using errcode='P0002', message='DEVELOPMENT_RESOURCE_UNAVAILABLE';
  end if;

  if v_owner_id is null or not exists (
    select 1 from public.people owner
    where owner.id=v_owner_id and owner.company_id=v_company_id and owner.status='active'
  ) then raise exception using errcode='22023', message='DEVELOPMENT_OWNER_INVALID'; end if;

  v_fingerprint := encode(extensions.digest(jsonb_build_array(p_employee_id,v_owner_id,v_title,v_description,p_priority,p_start_date,p_due_date)::text,'sha256'),'hex');
  select * into v_existing from public.development_plans
  where company_id=v_company_id and creation_idempotency_key=p_idempotency_key;
  if found then
    if v_existing.creation_fingerprint <> v_fingerprint then
      raise exception using errcode='23505', message='DEVELOPMENT_IDEMPOTENCY_CONFLICT';
    end if;
    return jsonb_build_object('status','already_created','planId',v_existing.id,'planStatus',v_existing.status,'version',v_existing.version);
  end if;

  insert into public.development_plans (
    company_id,employee_id,owner_id,title,description,priority,created_by,
    start_date,due_date,status,creation_idempotency_key,creation_fingerprint,updated_at
  ) values (
    v_company_id,p_employee_id,v_owner_id,v_title,v_description,p_priority,v_user_id,
    p_start_date,p_due_date,'draft',p_idempotency_key,v_fingerprint,clock_timestamp()
  ) returning id into v_plan_id;
  perform public.append_development_private_audit_v1(v_company_id,'plan.created',v_actor_person_id,'development_plan',v_plan_id,null,'draft',null,null,p_idempotency_key);
  return jsonb_build_object('status','created','planId',v_plan_id,'planStatus','draft','version',1);
end;
$$;

create function public.update_development_plan_v1(
  p_plan_id uuid,
  p_expected_version bigint,
  p_title text,
  p_description text,
  p_priority text,
  p_start_date date,
  p_due_date date
) returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare v_plan public.development_plans%rowtype; v_actor uuid; v_title text:=btrim(p_title); v_description text:=nullif(btrim(p_description),'');
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_plan from public.development_plans where id=p_plan_id for update;
  if not found or not public.can_manage_development_plan_v1(p_plan_id) then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  if v_plan.status not in ('draft','active') then raise exception using errcode='55000',message='DEVELOPMENT_PLAN_TERMINAL'; end if;
  if p_expected_version is distinct from v_plan.version then raise exception using errcode='40001',message='DEVELOPMENT_VERSION_CONFLICT'; end if;
  if v_title is null or char_length(v_title) not between 3 and 120 or v_description is not null and char_length(v_description)>1000
    or p_priority not in ('low','medium','high') or p_start_date is not null and p_due_date is not null and p_due_date<p_start_date
  then raise exception using errcode='22023',message='DEVELOPMENT_INPUT_INVALID'; end if;
  v_actor:=public.development_actor_person_id_v1(v_plan.company_id);
  update public.development_plans set title=v_title,description=v_description,priority=p_priority,start_date=p_start_date,due_date=p_due_date,version=version+1,updated_at=clock_timestamp() where id=p_plan_id;
  perform public.append_development_private_audit_v1(v_plan.company_id,'plan.updated',v_actor,'development_plan',p_plan_id,v_plan.status,v_plan.status);
  return jsonb_build_object('status','updated','planId',p_plan_id,'planStatus',v_plan.status,'version',v_plan.version+1);
end;
$$;

create function public.reassign_development_plan_owner_v1(p_plan_id uuid,p_new_owner_id uuid,p_expected_version bigint)
returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare v_plan public.development_plans%rowtype; v_actor uuid;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_plan from public.development_plans where id=p_plan_id for update;
  if not found or not public.development_actor_is_admin_v1(v_plan.company_id) then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  if v_plan.status not in ('draft','active') then raise exception using errcode='55000',message='DEVELOPMENT_PLAN_TERMINAL'; end if;
  if p_expected_version is distinct from v_plan.version then raise exception using errcode='40001',message='DEVELOPMENT_VERSION_CONFLICT'; end if;
  if not exists(select 1 from public.people where id=p_new_owner_id and company_id=v_plan.company_id and status='active') then raise exception using errcode='22023',message='DEVELOPMENT_OWNER_INVALID'; end if;
  v_actor:=public.development_actor_person_id_v1(v_plan.company_id);
  update public.development_plans set owner_id=p_new_owner_id,version=version+1,updated_at=clock_timestamp() where id=p_plan_id;
  perform public.append_development_private_audit_v1(v_plan.company_id,'plan.owner_reassigned',v_actor,'development_plan',p_plan_id,null,null);
  return jsonb_build_object('status','owner_reassigned','planId',p_plan_id,'ownerId',p_new_owner_id,'version',v_plan.version+1);
end; $$;

create function public.add_development_plan_goal_v1(
  p_plan_id uuid,
  p_competency_id uuid,
  p_title text,
  p_description text,
  p_current_level integer,
  p_expected_level integer,
  p_target_level integer
)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_plan public.development_plans%rowtype; v_goal_id uuid;
begin
  select * into v_plan from public.development_plans where id = p_plan_id for update;
  if not found or not public.can_manage_development_plan_v1(p_plan_id) then
    raise exception using errcode = 'P0002', message = 'DEVELOPMENT_PLAN_NOT_FOUND';
  end if;
  if v_plan.status <> 'draft' then
    raise exception using errcode = '23514', message = 'DEVELOPMENT_PLAN_STRUCTURE_LOCKED';
  end if;
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 200
    or p_current_level not between 0 and 5 or p_expected_level not between 1 and 5
    or p_target_level not between 1 and 5 or p_target_level < p_current_level
    or not exists (select 1 from public.competencies c where c.id = p_competency_id and c.company_id = v_plan.company_id and c.active)
  then raise exception using errcode = '22023', message = 'DEVELOPMENT_GOAL_INVALID'; end if;
  insert into public.development_goals(company_id,plan_id,competency_id,title,description,current_level,expected_level,target_level,status,updated_at)
  values(v_plan.company_id,p_plan_id,p_competency_id,btrim(p_title),nullif(btrim(p_description),''),p_current_level,p_expected_level,p_target_level,'not_started',now())
  returning id into v_goal_id;
  perform public.append_development_private_audit_v1(v_plan.company_id,'goal.created',public.development_actor_person_id_v1(v_plan.company_id),'development_goal',v_goal_id,null,'not_started',null,p_plan_id,null);
  return v_goal_id;
end; $$;

create function public.add_development_goal_action_v1(
  p_goal_id uuid,
  p_title text,
  p_description text,
  p_type text,
  p_due_date date
)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_goal public.development_goals%rowtype; v_plan public.development_plans%rowtype; v_action_id uuid;
begin
  select * into v_goal from public.development_goals where id = p_goal_id;
  if not found then raise exception using errcode = 'P0002', message = 'DEVELOPMENT_GOAL_NOT_FOUND'; end if;
  select * into v_plan from public.development_plans where id = v_goal.plan_id for update;
  if not found or not public.can_manage_development_plan_v1(v_plan.id) then
    raise exception using errcode = 'P0002', message = 'DEVELOPMENT_GOAL_NOT_FOUND';
  end if;
  if v_plan.status <> 'draft' then raise exception using errcode = '23514', message = 'DEVELOPMENT_PLAN_STRUCTURE_LOCKED'; end if;
  if nullif(btrim(p_title), '') is null or char_length(btrim(p_title)) > 200
    or p_type not in ('course','book','mentoring','shadowing','project','workshop','feedback','other')
  then raise exception using errcode = '22023', message = 'DEVELOPMENT_ACTION_INVALID'; end if;
  insert into public.development_actions(company_id,goal_id,title,description,type,status,due_date,updated_at)
  values(v_plan.company_id,p_goal_id,btrim(p_title),nullif(btrim(p_description),''),p_type,'pending',p_due_date,now())
  returning id into v_action_id;
  perform public.append_development_private_audit_v1(v_plan.company_id,'action.created',public.development_actor_person_id_v1(v_plan.company_id),'development_action',v_action_id,null,'pending',null,v_plan.id,null);
  return v_action_id;
end; $$;

create function public.activate_development_plan_v1(p_plan_id uuid,p_expected_version bigint)
returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare v_plan public.development_plans%rowtype; v_actor uuid;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_plan from public.development_plans where id=p_plan_id for update;
  if not found or not public.can_manage_development_plan_v1(p_plan_id) then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  if v_plan.status='active' then return jsonb_build_object('status','already_active','planId',p_plan_id,'planStatus','active','version',v_plan.version); end if;
  if v_plan.status<>'draft' then raise exception using errcode='55000',message='DEVELOPMENT_TRANSITION_INVALID'; end if;
  if p_expected_version is distinct from v_plan.version then raise exception using errcode='40001',message='DEVELOPMENT_VERSION_CONFLICT'; end if;
  if not exists(select 1 from public.people where id=v_plan.employee_id and company_id=v_plan.company_id and status in ('active','on_leave'))
    or not exists(select 1 from public.people where id=v_plan.owner_id and company_id=v_plan.company_id and status='active')
    or not exists(select 1 from public.development_actions a join public.development_goals g on g.id=a.goal_id and g.company_id=a.company_id where g.plan_id=p_plan_id and a.company_id=v_plan.company_id)
  then raise exception using errcode='55000',message='DEVELOPMENT_PLAN_NOT_ACTIVATABLE'; end if;
  v_actor:=public.development_actor_person_id_v1(v_plan.company_id);
  update public.development_plans set status='active',version=version+1,updated_at=clock_timestamp() where id=p_plan_id;
  perform public.append_development_private_audit_v1(v_plan.company_id,'plan.activated',v_actor,'development_plan',p_plan_id,'draft','active');
  return jsonb_build_object('status','activated','planId',p_plan_id,'planStatus','active','version',v_plan.version+1);
end; $$;

-- ---------------------------------------------------------------------------
-- Trusted action transitions.
-- ---------------------------------------------------------------------------
create function public.start_development_action_v1(p_action_id uuid)
returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare v_action public.development_actions%rowtype; v_plan public.development_plans%rowtype; v_actor uuid; v_goal_status text;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select a.* into v_action from public.development_actions a where a.id=p_action_id for update;
  if not found then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  select p.* into v_plan from public.development_goals g join public.development_plans p on p.id=g.plan_id and p.company_id=g.company_id where g.id=v_action.goal_id;
  v_actor:=public.development_actor_person_id_v1(v_plan.company_id);
  if v_actor is null or v_actor<>v_plan.employee_id or v_plan.status<>'active' then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  if v_action.status='in_progress' then return jsonb_build_object('status','already_in_progress','actionId',p_action_id); end if;
  if v_action.status<>'pending' then raise exception using errcode='55000',message='DEVELOPMENT_TRANSITION_INVALID'; end if;
  update public.development_actions set status='in_progress',completed_at=null,updated_at=clock_timestamp() where id=p_action_id;
  perform public.append_development_private_audit_v1(v_plan.company_id,'action.started',v_actor,'development_action',p_action_id,'pending','in_progress');
  v_goal_status:=public.synchronize_development_goal_status_v1(v_action.goal_id);
  return jsonb_build_object('status','started','actionId',p_action_id,'actionStatus','in_progress','goalStatus',v_goal_status);
end; $$;

create function public.complete_development_action_v1(p_action_id uuid)
returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare v_action public.development_actions%rowtype; v_plan public.development_plans%rowtype; v_actor uuid; v_goal_status text; v_completed_at timestamptz;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select a.* into v_action from public.development_actions a where a.id=p_action_id for update;
  if not found then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  select p.* into v_plan from public.development_goals g join public.development_plans p on p.id=g.plan_id and p.company_id=g.company_id where g.id=v_action.goal_id;
  v_actor:=public.development_actor_person_id_v1(v_plan.company_id);
  if v_actor is null or v_actor<>v_plan.employee_id or v_plan.status<>'active' then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  if v_action.status='completed' then return jsonb_build_object('status','already_completed','actionId',p_action_id,'completedAt',v_action.completed_at); end if;
  if v_action.status not in ('pending','in_progress') then raise exception using errcode='55000',message='DEVELOPMENT_TRANSITION_INVALID'; end if;
  v_completed_at:=clock_timestamp();
  update public.development_actions set status='completed',completed_at=v_completed_at,updated_at=v_completed_at where id=p_action_id;
  perform public.append_development_private_audit_v1(v_plan.company_id,'action.completed',v_actor,'development_action',p_action_id,v_action.status,'completed');
  v_goal_status:=public.synchronize_development_goal_status_v1(v_action.goal_id);
  return jsonb_build_object('status','completed','actionId',p_action_id,'actionStatus','completed','goalStatus',v_goal_status,'completedAt',v_completed_at);
end; $$;

create function public.skip_development_action_v1(p_action_id uuid,p_reason text)
returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare v_action public.development_actions%rowtype; v_plan public.development_plans%rowtype; v_actor uuid; v_goal_status text; v_reason text:=btrim(p_reason);
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if v_reason is null or char_length(v_reason) not between 1 and 500 then raise exception using errcode='22023',message='DEVELOPMENT_REASON_INVALID'; end if;
  select a.* into v_action from public.development_actions a where a.id=p_action_id for update;
  if not found then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  select p.* into v_plan from public.development_goals g join public.development_plans p on p.id=g.plan_id and p.company_id=g.company_id where g.id=v_action.goal_id;
  if v_plan.status<>'active' or not public.can_manage_development_plan_v1(v_plan.id) then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  if v_action.status='skipped' then return jsonb_build_object('status','already_skipped','actionId',p_action_id); end if;
  if v_action.status not in ('pending','in_progress') then raise exception using errcode='55000',message='DEVELOPMENT_TRANSITION_INVALID'; end if;
  v_actor:=public.development_actor_person_id_v1(v_plan.company_id);
  update public.development_actions set status='skipped',completed_at=null,updated_at=clock_timestamp() where id=p_action_id;
  perform public.append_development_private_audit_v1(v_plan.company_id,'action.skipped',v_actor,'development_action',p_action_id,v_action.status,'skipped',v_reason);
  v_goal_status:=public.synchronize_development_goal_status_v1(v_action.goal_id);
  return jsonb_build_object('status','skipped','actionId',p_action_id,'actionStatus','skipped','goalStatus',v_goal_status);
end; $$;

-- ---------------------------------------------------------------------------
-- Reviews and terminal plan transitions.
-- ---------------------------------------------------------------------------
create function public.record_development_review_v1(
  p_plan_id uuid,p_type text,p_summary text,p_next_step text,p_idempotency_key uuid
) returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare v_plan public.development_plans%rowtype; v_actor uuid; v_summary text:=btrim(p_summary); v_next text:=nullif(btrim(p_next_step),''); v_fingerprint text; v_existing public.development_reviews%rowtype; v_review_id uuid; v_watermark bigint; v_reviewed_at timestamptz;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if p_type not in ('periodic','final') or v_summary is null or char_length(v_summary) not between 1 and 4000
    or (p_type='periodic' and (v_next is null or char_length(v_next)>2000)) or (p_type='final' and v_next is not null and char_length(v_next)>2000)
    or p_idempotency_key is null
  then raise exception using errcode='22023',message='DEVELOPMENT_REVIEW_INPUT_INVALID'; end if;
  select * into v_plan from public.development_plans where id=p_plan_id for update;
  if not found or not public.can_manage_development_plan_v1(p_plan_id) then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  if v_plan.status<>'active' then raise exception using errcode='55000',message='DEVELOPMENT_PLAN_NOT_ACTIVE'; end if;
  v_actor:=public.development_actor_person_id_v1(v_plan.company_id);
  if v_actor is null then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  if p_type='final' and (
    not exists(select 1 from public.development_actions a join public.development_goals g on g.id=a.goal_id and g.company_id=a.company_id where g.plan_id=p_plan_id)
    or exists(select 1 from public.development_actions a join public.development_goals g on g.id=a.goal_id and g.company_id=a.company_id where g.plan_id=p_plan_id and a.status not in ('completed','skipped'))
    or not exists(select 1 from public.development_actions a join public.development_goals g on g.id=a.goal_id and g.company_id=a.company_id where g.plan_id=p_plan_id and a.status='completed')
  ) then raise exception using errcode='55000',message='DEVELOPMENT_ACTIONS_NOT_TERMINAL'; end if;
  v_fingerprint:=encode(extensions.digest(jsonb_build_array(p_plan_id,p_type,v_summary,v_next)::text,'sha256'),'hex');
  select * into v_existing from public.development_reviews where company_id=v_plan.company_id and idempotency_key=p_idempotency_key;
  if found then
    if v_existing.intent_fingerprint<>v_fingerprint then raise exception using errcode='23505',message='DEVELOPMENT_IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('status','already_recorded','reviewId',v_existing.id,'reviewType',v_existing.type,'reviewedAt',v_existing.reviewed_at);
  end if;
  select coalesce(max(audit.id),0) into v_watermark
  from public.development_private_audit audit
  join public.development_actions action on action.id=audit.entity_id and audit.entity_type='development_action'
  join public.development_goals goal on goal.id=action.goal_id and goal.company_id=action.company_id
  where goal.plan_id=p_plan_id and audit.company_id=v_plan.company_id;
  v_reviewed_at:=clock_timestamp();
  insert into public.development_reviews(company_id,development_plan_id,reviewer_id,type,reviewed_at,summary,next_step,action_transition_watermark,idempotency_key,intent_fingerprint,created_at)
  values(v_plan.company_id,p_plan_id,v_actor,p_type,v_reviewed_at,v_summary,v_next,v_watermark,p_idempotency_key,v_fingerprint,v_reviewed_at)
  returning id into v_review_id;
  perform public.append_development_private_audit_v1(v_plan.company_id,case when p_type='final' then 'review.final_recorded' else 'review.periodic_recorded' end,v_actor,'development_review',v_review_id,null,p_type,null,null,p_idempotency_key);
  return jsonb_build_object('status','recorded','reviewId',v_review_id,'reviewType',p_type,'reviewedAt',v_reviewed_at);
end; $$;

create function public.complete_development_plan_v1(p_plan_id uuid,p_expected_version bigint)
returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare v_plan public.development_plans%rowtype; v_actor uuid; v_latest_transition bigint; v_review public.development_reviews%rowtype; v_completed_at timestamptz;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  select * into v_plan from public.development_plans where id=p_plan_id for update;
  if not found or not public.can_manage_development_plan_v1(p_plan_id) then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  if v_plan.status='completed' then return jsonb_build_object('status','already_completed','planId',p_plan_id,'planStatus','completed','version',v_plan.version); end if;
  if v_plan.status<>'active' then raise exception using errcode='55000',message='DEVELOPMENT_TRANSITION_INVALID'; end if;
  if p_expected_version is distinct from v_plan.version then raise exception using errcode='40001',message='DEVELOPMENT_VERSION_CONFLICT'; end if;
  if not exists(select 1 from public.development_actions a join public.development_goals g on g.id=a.goal_id and g.company_id=a.company_id where g.plan_id=p_plan_id)
    or exists(select 1 from public.development_actions a join public.development_goals g on g.id=a.goal_id and g.company_id=a.company_id where g.plan_id=p_plan_id and a.status not in ('completed','skipped'))
    or not exists(select 1 from public.development_actions a join public.development_goals g on g.id=a.goal_id and g.company_id=a.company_id where g.plan_id=p_plan_id and a.status='completed')
  then raise exception using errcode='55000',message='DEVELOPMENT_ACTIONS_NOT_TERMINAL'; end if;
  select coalesce(max(audit.id),0) into v_latest_transition
  from public.development_private_audit audit
  join public.development_actions action on action.id=audit.entity_id and audit.entity_type='development_action'
  join public.development_goals goal on goal.id=action.goal_id and goal.company_id=action.company_id
  where goal.plan_id=p_plan_id and audit.company_id=v_plan.company_id;
  select * into v_review from public.development_reviews review
  where review.company_id=v_plan.company_id and review.development_plan_id=p_plan_id and review.type='final'
    and review.action_transition_watermark>=v_latest_transition
    and review.reviewed_at>(select coalesce(max(a.updated_at),'-infinity'::timestamptz) from public.development_actions a join public.development_goals g on g.id=a.goal_id and g.company_id=a.company_id where g.plan_id=p_plan_id)
  order by review.reviewed_at desc,review.id desc limit 1;
  if not found then raise exception using errcode='55000',message='DEVELOPMENT_FINAL_REVIEW_REQUIRED_OR_STALE'; end if;
  v_actor:=public.development_actor_person_id_v1(v_plan.company_id); v_completed_at:=clock_timestamp();
  update public.development_plans set status='completed',completed_at=v_completed_at,version=version+1,updated_at=v_completed_at where id=p_plan_id;
  perform public.append_development_private_audit_v1(v_plan.company_id,'plan.completed',v_actor,'development_plan',p_plan_id,'active','completed');
  return jsonb_build_object('status','completed','planId',p_plan_id,'planStatus','completed','version',v_plan.version+1,'completedAt',v_completed_at);
end; $$;

create function public.cancel_development_plan_v1(p_plan_id uuid,p_expected_version bigint,p_reason text)
returns jsonb language plpgsql volatile security definer set search_path=public,pg_temp as $$
declare v_plan public.development_plans%rowtype; v_actor uuid; v_reason text:=btrim(p_reason);
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if v_reason is null or char_length(v_reason) not between 1 and 500 then raise exception using errcode='22023',message='DEVELOPMENT_REASON_INVALID'; end if;
  select * into v_plan from public.development_plans where id=p_plan_id for update;
  if not found or not public.can_manage_development_plan_v1(p_plan_id) then raise exception using errcode='P0002',message='DEVELOPMENT_RESOURCE_UNAVAILABLE'; end if;
  if v_plan.status='cancelled' then return jsonb_build_object('status','already_cancelled','planId',p_plan_id,'planStatus','cancelled','version',v_plan.version); end if;
  if v_plan.status<>'active' then raise exception using errcode='55000',message='DEVELOPMENT_TRANSITION_INVALID'; end if;
  if p_expected_version is distinct from v_plan.version then raise exception using errcode='40001',message='DEVELOPMENT_VERSION_CONFLICT'; end if;
  v_actor:=public.development_actor_person_id_v1(v_plan.company_id);
  update public.development_plans set status='cancelled',completed_at=null,version=version+1,updated_at=clock_timestamp() where id=p_plan_id;
  perform public.append_development_private_audit_v1(v_plan.company_id,'plan.cancelled',v_actor,'development_plan',p_plan_id,'active','cancelled',v_reason);
  return jsonb_build_object('status','cancelled','planId',p_plan_id,'planStatus','cancelled','version',v_plan.version+1);
end; $$;

-- ---------------------------------------------------------------------------
-- Grants. Internal helpers stay uncallable; public boundaries are authenticated
-- only. Direct authenticated table access is explicitly closed again.
-- ---------------------------------------------------------------------------
revoke all on function public.development_actor_person_id_v1(uuid), public.development_actor_is_admin_v1(uuid),
  public.can_read_development_plan_v1(uuid), public.can_manage_development_plan_v1(uuid),
  public.append_development_private_audit_v1(uuid,text,uuid,text,uuid,text,text,text,uuid,uuid),
  public.synchronize_development_goal_status_v1(uuid), public.protect_development_append_only_v1()
from public, anon, authenticated, service_role;

revoke all on function public.get_authorized_development_plans_v1(uuid,uuid),
  public.get_authorized_development_goals_v1(uuid,uuid), public.get_authorized_development_actions_v1(uuid,uuid),
  public.get_authorized_development_reviews_v1(uuid,uuid),
  public.create_development_plan_v1(uuid,uuid,text,text,text,date,date,uuid),
  public.update_development_plan_v1(uuid,bigint,text,text,text,date,date),
  public.add_development_plan_goal_v1(uuid,uuid,text,text,integer,integer,integer),
  public.add_development_goal_action_v1(uuid,text,text,text,date),
  public.reassign_development_plan_owner_v1(uuid,uuid,bigint),
  public.activate_development_plan_v1(uuid,bigint), public.cancel_development_plan_v1(uuid,bigint,text),
  public.complete_development_plan_v1(uuid,bigint), public.start_development_action_v1(uuid),
  public.complete_development_action_v1(uuid), public.skip_development_action_v1(uuid,text),
  public.record_development_review_v1(uuid,text,text,text,uuid)
from public, anon, authenticated, service_role;

grant execute on function public.get_authorized_development_plans_v1(uuid,uuid),
  public.get_authorized_development_goals_v1(uuid,uuid), public.get_authorized_development_actions_v1(uuid,uuid),
  public.get_authorized_development_reviews_v1(uuid,uuid),
  public.create_development_plan_v1(uuid,uuid,text,text,text,date,date,uuid),
  public.update_development_plan_v1(uuid,bigint,text,text,text,date,date),
  public.add_development_plan_goal_v1(uuid,uuid,text,text,integer,integer,integer),
  public.add_development_goal_action_v1(uuid,text,text,text,date),
  public.reassign_development_plan_owner_v1(uuid,uuid,bigint),
  public.activate_development_plan_v1(uuid,bigint), public.cancel_development_plan_v1(uuid,bigint,text),
  public.complete_development_plan_v1(uuid,bigint), public.start_development_action_v1(uuid),
  public.complete_development_action_v1(uuid), public.skip_development_action_v1(uuid,text),
  public.record_development_review_v1(uuid,text,text,text,uuid)
to authenticated;

revoke all on table public.development_plans, public.development_goals, public.development_actions
from public, anon, authenticated;

notify pgrst, 'reload schema';
