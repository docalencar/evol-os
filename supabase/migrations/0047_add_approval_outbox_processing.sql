-- =====================================================
-- PR-087E2 — Approval outbox processing
-- =====================================================

alter table public.approval_domain_events
  add column if not exists processed_at timestamptz,
  add column if not exists processing_started_at timestamptz,
  add column if not exists processing_token uuid,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists last_error text;

alter table public.approval_domain_events
  add constraint approval_domain_events_attempt_count_check
    check (attempt_count >= 0),
  add constraint approval_domain_events_processing_state_check
    check (
      processed_at is null
      or processing_token is null
    );

create index if not exists approval_domain_events_pending_idx
  on public.approval_domain_events(next_attempt_at, created_at)
  where processed_at is null;

alter table public.activity_events
  add column if not exists idempotency_key text;

alter table public.activity_events
  add constraint activity_events_company_idempotency_key
    unique (company_id, idempotency_key);

create or replace function public.prevent_approval_audit_changes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'DELETE' or tg_table_name = 'approval_decisions' then
    raise exception 'Approval decisions and domain events are immutable.';
  end if;

  if new.id is distinct from old.id
    or new.event_key is distinct from old.event_key
    or new.approval_request_id is distinct from old.approval_request_id
    or new.company_id is distinct from old.company_id
    or new.event_type is distinct from old.event_type
    or new.actor_type is distinct from old.actor_type
    or new.actor_id is distinct from old.actor_id
    or new.actor_person_id is distinct from old.actor_person_id
    or new.actor_display_name_snapshot is distinct from old.actor_display_name_snapshot
    or new.occurred_at is distinct from old.occurred_at
    or new.aggregate_version is distinct from old.aggregate_version
    or new.payload is distinct from old.payload
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Approval domain event content is immutable.';
  end if;

  return new;
end;
$$;

create or replace function public.claim_approval_domain_events(
  p_company_id uuid,
  p_batch_size integer,
  p_lock_timeout_seconds integer default 300
)
returns setof public.approval_domain_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.role() <> 'service_role' then
    if auth.uid() is null then
      raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
    end if;

    if not public.has_company_role(
      p_company_id,
      array['owner', 'admin', 'hr']
    ) then
      raise exception using errcode = '42501', message = 'APPROVAL_PERMISSION_DENIED';
    end if;
  end if;

  if p_batch_size < 1 or p_batch_size > 100 then
    raise exception using errcode = '22023', message = 'INVALID_BATCH_SIZE';
  end if;

  if p_lock_timeout_seconds < 1 then
    raise exception using errcode = '22023', message = 'INVALID_LOCK_TIMEOUT';
  end if;

  return query
  with candidates as (
    select event.id
    from public.approval_domain_events event
    where event.company_id = p_company_id
      and event.processed_at is null
      and event.next_attempt_at <= now()
      and (
        event.processing_token is null
        or event.processing_started_at <
          now() - make_interval(secs => p_lock_timeout_seconds)
      )
    order by event.created_at, event.id
    for update skip locked
    limit p_batch_size
  )
  update public.approval_domain_events event
  set
    processing_token = gen_random_uuid(),
    processing_started_at = now(),
    attempt_count = event.attempt_count + 1,
    last_error = null
  from candidates
  where event.id = candidates.id
  returning event.*;
end;
$$;

create or replace function public.complete_approval_domain_event(
  p_company_id uuid,
  p_event_id uuid,
  p_processing_token uuid,
  p_processed_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated_count integer;
begin
  if auth.role() <> 'service_role' then
    if auth.uid() is null then
      raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
    end if;

    if not public.has_company_role(
      p_company_id,
      array['owner', 'admin', 'hr']
    ) then
      raise exception using errcode = '42501', message = 'APPROVAL_PERMISSION_DENIED';
    end if;
  end if;

  update public.approval_domain_events
  set
    processed_at = p_processed_at,
    processing_token = null,
    processing_started_at = null,
    last_error = null
  where id = p_event_id
    and company_id = p_company_id
    and processed_at is null
    and processing_token = p_processing_token;

  get diagnostics v_updated_count = row_count;
  return v_updated_count = 1;
end;
$$;

create or replace function public.fail_approval_domain_event(
  p_company_id uuid,
  p_event_id uuid,
  p_processing_token uuid,
  p_error text,
  p_next_attempt_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated_count integer;
begin
  if auth.role() <> 'service_role' then
    if auth.uid() is null then
      raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
    end if;

    if not public.has_company_role(
      p_company_id,
      array['owner', 'admin', 'hr']
    ) then
      raise exception using errcode = '42501', message = 'APPROVAL_PERMISSION_DENIED';
    end if;
  end if;

  update public.approval_domain_events
  set
    processing_token = null,
    processing_started_at = null,
    last_error = left(p_error, 2000),
    next_attempt_at = p_next_attempt_at
  where id = p_event_id
    and company_id = p_company_id
    and processed_at is null
    and processing_token = p_processing_token;

  get diagnostics v_updated_count = row_count;
  return v_updated_count = 1;
end;
$$;

revoke all on function public.claim_approval_domain_events(uuid, integer, integer)
from public;
revoke all on function public.complete_approval_domain_event(uuid, uuid, uuid, timestamptz)
from public;
revoke all on function public.fail_approval_domain_event(uuid, uuid, uuid, text, timestamptz)
from public;

grant execute on function public.claim_approval_domain_events(uuid, integer, integer)
to authenticated, service_role;
grant execute on function public.complete_approval_domain_event(uuid, uuid, uuid, timestamptz)
to authenticated, service_role;
grant execute on function public.fail_approval_domain_event(uuid, uuid, uuid, text, timestamptz)
to authenticated, service_role;

notify pgrst, 'reload schema';
