-- =====================================================
-- PR-087C — Approval persistence foundation
-- =====================================================

create table if not exists public.approval_requests (
  id uuid primary key,
  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  module text not null,
  entity_type text not null,
  entity_id text not null,
  entity_version text not null,
  snapshot_fingerprint text,

  requester_actor_type text not null,
  requester_actor_id text,
  requester_person_id text,
  requester_display_name_snapshot text,

  context_schema_version text not null,
  context_summary text not null,
  context_metadata jsonb not null default '{}'::jsonb,
  plan_snapshot jsonb not null,

  status text not null,
  requested_at timestamptz not null,
  expires_at timestamptz,
  completed_at timestamptz,
  version integer not null,
  idempotency_key text not null,
  correlation_id text,
  supersedes_request_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint approval_requests_status_check
    check (
      status in (
        'pending',
        'approved',
        'rejected',
        'withdrawn',
        'cancelled',
        'expired'
      )
    ),
  constraint approval_requests_actor_type_check
    check (
      requester_actor_type in (
        'user',
        'system',
        'automation',
        'integration'
      )
    ),
  constraint approval_requests_user_actor_check
    check (
      requester_actor_type <> 'user'
      or requester_actor_id is not null
    ),
  constraint approval_requests_version_check
    check (version > 0),
  constraint approval_requests_context_metadata_check
    check (jsonb_typeof(context_metadata) = 'object'),
  constraint approval_requests_plan_snapshot_check
    check (jsonb_typeof(plan_snapshot) = 'object'),
  constraint approval_requests_completion_check
    check (
      (status = 'pending' and completed_at is null)
      or (status <> 'pending' and completed_at is not null)
    ),
  constraint approval_requests_expiration_check
    check (
      expires_at is null
      or expires_at > requested_at
    ),
  constraint approval_requests_not_self_superseding_check
    check (
      supersedes_request_id is null
      or supersedes_request_id <> id
    ),
  constraint approval_requests_supersedes_company_fk
    foreign key (supersedes_request_id, company_id)
    references public.approval_requests(id, company_id)
    on delete restrict,
  constraint approval_requests_idempotency_key
    unique (company_id, idempotency_key),
  constraint approval_requests_id_company_key
    unique (id, company_id)
);

create table if not exists public.approval_stages (
  id uuid primary key,
  approval_request_id uuid not null,
  company_id uuid not null
    references public.companies(id)
    on delete cascade,
  sequence integer not null,
  name text not null,
  decision_rule text not null,
  status text not null,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint approval_stages_request_company_fk
    foreign key (approval_request_id, company_id)
    references public.approval_requests(id, company_id)
    on delete cascade,
  constraint approval_stages_sequence_check
    check (sequence > 0),
  constraint approval_stages_decision_rule_check
    check (decision_rule in ('any')),
  constraint approval_stages_status_check
    check (
      status in (
        'waiting',
        'active',
        'approved',
        'rejected',
        'cancelled',
        'skipped'
      )
    ),
  constraint approval_stages_dates_check
    check (
      (status = 'waiting' and started_at is null and completed_at is null)
      or (status = 'active' and started_at is not null and completed_at is null)
      or (
        status in ('approved', 'rejected', 'cancelled', 'skipped')
        and completed_at is not null
      )
    ),
  constraint approval_stages_request_sequence_key
    unique (approval_request_id, sequence),
  constraint approval_stages_request_id_key
    unique (approval_request_id, id),
  constraint approval_stages_request_id_company_key
    unique (approval_request_id, id, company_id)
);

create table if not exists public.approval_assignments (
  id uuid primary key,
  approval_request_id uuid not null,
  stage_id uuid not null,
  company_id uuid not null
    references public.companies(id)
    on delete cascade,
  principal_type text not null,
  principal_id text not null,
  principal_display_name_snapshot text,
  status text not null,
  assigned_at timestamptz not null,
  decided_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint approval_assignments_stage_fk
    foreign key (approval_request_id, stage_id, company_id)
    references public.approval_stages(
      approval_request_id,
      id,
      company_id
    )
    on delete cascade,
  constraint approval_assignments_principal_type_check
    check (principal_type in ('user', 'person')),
  constraint approval_assignments_status_check
    check (status in ('assigned', 'decided', 'revoked')),
  constraint approval_assignments_dates_check
    check (
      (
        status = 'assigned'
        and decided_at is null
        and revoked_at is null
      )
      or (
        status = 'decided'
        and decided_at is not null
        and revoked_at is null
      )
      or (
        status = 'revoked'
        and decided_at is null
        and revoked_at is not null
      )
    ),
  constraint approval_assignments_stage_principal_key
    unique (stage_id, principal_type, principal_id),
  constraint approval_assignments_request_id_key
    unique (approval_request_id, id),
  constraint approval_assignments_request_id_company_key
    unique (approval_request_id, id, company_id)
);

create table if not exists public.approval_decisions (
  id uuid primary key,
  approval_request_id uuid not null,
  stage_id uuid not null,
  assignment_id uuid not null,
  company_id uuid not null
    references public.companies(id)
    on delete cascade,
  actor_type text not null,
  actor_id text,
  actor_person_id text,
  actor_display_name_snapshot text,
  outcome text not null,
  comment text,
  decided_at timestamptz not null,
  subject_version text not null,
  request_version integer not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),

  constraint approval_decisions_request_company_fk
    foreign key (approval_request_id, company_id)
    references public.approval_requests(id, company_id)
    on delete cascade,
  constraint approval_decisions_assignment_fk
    foreign key (approval_request_id, assignment_id, company_id)
    references public.approval_assignments(
      approval_request_id,
      id,
      company_id
    )
    on delete restrict,
  constraint approval_decisions_stage_fk
    foreign key (approval_request_id, stage_id, company_id)
    references public.approval_stages(
      approval_request_id,
      id,
      company_id
    )
    on delete restrict,
  constraint approval_decisions_actor_type_check
    check (
      actor_type in ('user', 'system', 'automation', 'integration')
    ),
  constraint approval_decisions_user_actor_check
    check (actor_type <> 'user' or actor_id is not null),
  constraint approval_decisions_outcome_check
    check (outcome in ('approved', 'rejected')),
  constraint approval_decisions_rejection_comment_check
    check (outcome <> 'rejected' or char_length(trim(comment)) > 0),
  constraint approval_decisions_request_version_check
    check (request_version > 0),
  constraint approval_decisions_assignment_key
    unique (assignment_id),
  constraint approval_decisions_idempotency_key
    unique (approval_request_id, idempotency_key)
);

create table if not exists public.approval_domain_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null,
  approval_request_id uuid not null,
  company_id uuid not null
    references public.companies(id)
    on delete cascade,
  event_type text not null,
  actor_type text not null,
  actor_id text,
  actor_person_id text,
  actor_display_name_snapshot text,
  occurred_at timestamptz not null,
  aggregate_version integer not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint approval_domain_events_request_company_fk
    foreign key (approval_request_id, company_id)
    references public.approval_requests(id, company_id)
    on delete cascade,
  constraint approval_domain_events_type_check
    check (
      event_type in (
        'approval.requested',
        'approval.stage.activated',
        'approval.assigned',
        'approval.decision.recorded',
        'approval.approved',
        'approval.rejected',
        'approval.withdrawn',
        'approval.cancelled',
        'approval.expired'
      )
    ),
  constraint approval_domain_events_actor_type_check
    check (
      actor_type in ('user', 'system', 'automation', 'integration')
    ),
  constraint approval_domain_events_user_actor_check
    check (actor_type <> 'user' or actor_id is not null),
  constraint approval_domain_events_version_check
    check (aggregate_version > 0),
  constraint approval_domain_events_payload_check
    check (jsonb_typeof(payload) = 'object'),
  constraint approval_domain_events_request_event_key
    unique (approval_request_id, company_id, event_key)
);

create index if not exists approval_requests_company_requested_idx
  on public.approval_requests(company_id, requested_at desc);

create index if not exists approval_requests_subject_idx
  on public.approval_requests(
    company_id,
    module,
    entity_type,
    entity_id,
    requested_at desc
  );

create index if not exists approval_requests_pending_idx
  on public.approval_requests(company_id, requested_at desc)
  where status = 'pending';

create index if not exists approval_assignments_principal_idx
  on public.approval_assignments(
    company_id,
    principal_type,
    principal_id,
    assigned_at desc
  )
  where status = 'assigned';

create index if not exists approval_decisions_request_idx
  on public.approval_decisions(approval_request_id, decided_at asc);

create index if not exists approval_domain_events_request_idx
  on public.approval_domain_events(
    approval_request_id,
    aggregate_version asc,
    occurred_at asc
  );

alter table public.approval_requests enable row level security;
alter table public.approval_stages enable row level security;
alter table public.approval_assignments enable row level security;
alter table public.approval_decisions enable row level security;
alter table public.approval_domain_events enable row level security;

create policy "members can read approval requests"
on public.approval_requests for select
using (public.is_company_member(company_id));

create policy "admins and hr manage approval requests"
on public.approval_requests for all
using (
  public.has_company_role(company_id, array['owner', 'admin', 'hr'])
)
with check (
  public.has_company_role(company_id, array['owner', 'admin', 'hr'])
);

create policy "members can read approval stages"
on public.approval_stages for select
using (public.is_company_member(company_id));

create policy "admins and hr manage approval stages"
on public.approval_stages for all
using (
  public.has_company_role(company_id, array['owner', 'admin', 'hr'])
)
with check (
  public.has_company_role(company_id, array['owner', 'admin', 'hr'])
);

create policy "members can read approval assignments"
on public.approval_assignments for select
using (public.is_company_member(company_id));

create policy "admins and hr manage approval assignments"
on public.approval_assignments for all
using (
  public.has_company_role(company_id, array['owner', 'admin', 'hr'])
)
with check (
  public.has_company_role(company_id, array['owner', 'admin', 'hr'])
);

create policy "members can read approval decisions"
on public.approval_decisions for select
using (public.is_company_member(company_id));

create policy "admins and hr create approval decisions"
on public.approval_decisions for insert
with check (
  public.has_company_role(company_id, array['owner', 'admin', 'hr'])
);

create policy "members can read approval domain events"
on public.approval_domain_events for select
using (public.is_company_member(company_id));

create policy "admins and hr create approval domain events"
on public.approval_domain_events for insert
with check (
  public.has_company_role(company_id, array['owner', 'admin', 'hr'])
);

create or replace function public.save_approval_request(
  p_aggregate jsonb,
  p_events jsonb,
  p_expected_version integer
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_request jsonb := p_aggregate -> 'request';
  v_request_id uuid := (v_request ->> 'id')::uuid;
  v_company_id uuid := (v_request ->> 'company_id')::uuid;
  v_new_version integer := (v_request ->> 'version')::integer;
  v_current public.approval_requests%rowtype;
  v_item jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  if not public.has_company_role(
    v_company_id,
    array['owner', 'admin', 'hr']
  ) then
    raise exception using errcode = '42501', message = 'APPROVAL_PERMISSION_DENIED';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(v_company_id::text),
    hashtext(v_request_id::text)
  );

  select * into v_current
  from public.approval_requests
  where id = v_request_id
    and company_id = v_company_id
  for update;

  if found then
    if v_current.version <> p_expected_version then
      raise exception using
        errcode = '40001',
        message = 'APPROVAL_VERSION_CONFLICT';
    end if;

    if v_new_version <> p_expected_version + 1 then
      raise exception using
        errcode = '22023',
        message = 'APPROVAL_INVALID_NEXT_VERSION';
    end if;

    if v_current.module <> v_request ->> 'module'
      or v_current.entity_type <> v_request ->> 'entity_type'
      or v_current.entity_id <> v_request ->> 'entity_id'
      or v_current.entity_version <> v_request ->> 'entity_version'
      or v_current.idempotency_key <> v_request ->> 'idempotency_key'
    then
      raise exception using
        errcode = '22023',
        message = 'APPROVAL_IMMUTABLE_DATA_CHANGED';
    end if;

    update public.approval_requests
    set
      status = v_request ->> 'status',
      expires_at = (v_request ->> 'expires_at')::timestamptz,
      completed_at = (v_request ->> 'completed_at')::timestamptz,
      version = v_new_version,
      updated_at = now()
    where id = v_request_id
      and company_id = v_company_id;
  else
    if p_expected_version <> 0 or v_new_version <> 1 then
      raise exception using
        errcode = '40001',
        message = 'APPROVAL_VERSION_CONFLICT';
    end if;

    if (v_request ->> 'supersedes_request_id') is not null
      and not exists (
        select 1
        from public.approval_requests
        where id = (v_request ->> 'supersedes_request_id')::uuid
          and company_id = v_company_id
      )
    then
      raise exception using
        errcode = '23503',
        message = 'APPROVAL_SUPERSEDED_REQUEST_NOT_FOUND';
    end if;

    insert into public.approval_requests (
      id, company_id, module, entity_type, entity_id,
      entity_version, snapshot_fingerprint,
      requester_actor_type, requester_actor_id,
      requester_person_id, requester_display_name_snapshot,
      context_schema_version, context_summary, context_metadata,
      plan_snapshot, status, requested_at, expires_at,
      completed_at, version, idempotency_key, correlation_id,
      supersedes_request_id
    ) values (
      v_request_id, v_company_id,
      v_request ->> 'module', v_request ->> 'entity_type',
      v_request ->> 'entity_id', v_request ->> 'entity_version',
      v_request ->> 'snapshot_fingerprint',
      v_request ->> 'requester_actor_type',
      v_request ->> 'requester_actor_id',
      v_request ->> 'requester_person_id',
      v_request ->> 'requester_display_name_snapshot',
      v_request ->> 'context_schema_version',
      v_request ->> 'context_summary',
      v_request -> 'context_metadata', v_request -> 'plan_snapshot',
      v_request ->> 'status',
      (v_request ->> 'requested_at')::timestamptz,
      (v_request ->> 'expires_at')::timestamptz,
      (v_request ->> 'completed_at')::timestamptz,
      v_new_version, v_request ->> 'idempotency_key',
      v_request ->> 'correlation_id',
      (v_request ->> 'supersedes_request_id')::uuid
    );
  end if;

  for v_item in select value from jsonb_array_elements(p_aggregate -> 'stages')
  loop
    if exists (
      select 1
      from public.approval_stages
      where id = (v_item ->> 'id')::uuid
        and approval_request_id <> v_request_id
    ) then
      raise exception using
        errcode = '23505',
        message = 'APPROVAL_STAGE_ID_ALREADY_IN_USE';
    end if;

    insert into public.approval_stages (
      id, approval_request_id, company_id, sequence, name,
      decision_rule, status, started_at, completed_at, updated_at
    ) values (
      (v_item ->> 'id')::uuid, v_request_id, v_company_id,
      (v_item ->> 'sequence')::integer, v_item ->> 'name',
      v_item ->> 'decision_rule', v_item ->> 'status',
      (v_item ->> 'started_at')::timestamptz,
      (v_item ->> 'completed_at')::timestamptz, now()
    )
    on conflict (id) do update set
      status = excluded.status,
      started_at = excluded.started_at,
      completed_at = excluded.completed_at,
      updated_at = now();
  end loop;

  for v_item in select value from jsonb_array_elements(p_aggregate -> 'assignments')
  loop
    if exists (
      select 1
      from public.approval_assignments
      where id = (v_item ->> 'id')::uuid
        and approval_request_id <> v_request_id
    ) then
      raise exception using
        errcode = '23505',
        message = 'APPROVAL_ASSIGNMENT_ID_ALREADY_IN_USE';
    end if;

    insert into public.approval_assignments (
      id, approval_request_id, stage_id, company_id,
      principal_type, principal_id, principal_display_name_snapshot,
      status, assigned_at, decided_at, revoked_at, updated_at
    ) values (
      (v_item ->> 'id')::uuid, v_request_id,
      (v_item ->> 'stage_id')::uuid, v_company_id,
      v_item ->> 'principal_type', v_item ->> 'principal_id',
      v_item ->> 'principal_display_name_snapshot',
      v_item ->> 'status',
      (v_item ->> 'assigned_at')::timestamptz,
      (v_item ->> 'decided_at')::timestamptz,
      (v_item ->> 'revoked_at')::timestamptz, now()
    )
    on conflict (id) do update set
      status = excluded.status,
      decided_at = excluded.decided_at,
      revoked_at = excluded.revoked_at,
      updated_at = now();
  end loop;

  for v_item in select value from jsonb_array_elements(p_aggregate -> 'decisions')
  loop
    insert into public.approval_decisions (
      id, approval_request_id, stage_id, assignment_id, company_id,
      actor_type, actor_id, actor_person_id,
      actor_display_name_snapshot, outcome, comment, decided_at,
      subject_version, request_version, idempotency_key
    ) values (
      (v_item ->> 'id')::uuid, v_request_id,
      (v_item ->> 'stage_id')::uuid,
      (v_item ->> 'assignment_id')::uuid, v_company_id,
      v_item ->> 'actor_type', v_item ->> 'actor_id',
      v_item ->> 'actor_person_id',
      v_item ->> 'actor_display_name_snapshot',
      v_item ->> 'outcome', v_item ->> 'comment',
      (v_item ->> 'decided_at')::timestamptz,
      v_item ->> 'subject_version',
      (v_item ->> 'request_version')::integer,
      v_item ->> 'idempotency_key'
    )
    on conflict (id) do nothing;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_events, '[]'::jsonb))
  loop
    insert into public.approval_domain_events (
      approval_request_id, company_id, event_key, event_type,
      actor_type, actor_id, actor_person_id,
      actor_display_name_snapshot, occurred_at,
      aggregate_version, payload
    ) values (
      v_request_id,
      v_company_id,
      encode(
        digest(
          concat_ws(
            ':',
            v_request_id::text,
            v_item ->> 'event_type',
            v_item ->> 'aggregate_version',
            v_item ->> 'actor_type',
            coalesce(v_item ->> 'actor_id', ''),
            coalesce(v_item ->> 'actor_person_id', ''),
            v_item ->> 'occurred_at',
            (v_item -> 'payload')::text
          ),
          'sha256'
        ),
        'hex'
      ),
      v_item ->> 'event_type',
      v_item ->> 'actor_type', v_item ->> 'actor_id',
      v_item ->> 'actor_person_id',
      v_item ->> 'actor_display_name_snapshot',
      (v_item ->> 'occurred_at')::timestamptz,
      (v_item ->> 'aggregate_version')::integer,
      v_item -> 'payload'
    )
    on conflict (
      approval_request_id,
      company_id,
      event_key
    ) do nothing;
  end loop;

  return v_request_id;
end;
$$;

revoke all on function public.save_approval_request(jsonb, jsonb, integer)
from public;

grant execute on function public.save_approval_request(jsonb, jsonb, integer)
to authenticated;

revoke insert, update, delete
on public.approval_requests,
  public.approval_stages,
  public.approval_assignments,
  public.approval_decisions,
  public.approval_domain_events
from anon, authenticated;

create or replace function public.prevent_approval_audit_changes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'Approval decisions and domain events are immutable.';
end;
$$;

create trigger prevent_approval_decision_update
before update or delete on public.approval_decisions
for each row execute function public.prevent_approval_audit_changes();

create trigger prevent_approval_domain_event_update
before update or delete on public.approval_domain_events
for each row execute function public.prevent_approval_audit_changes();

notify pgrst, 'reload schema';
