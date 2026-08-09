-- MVP-PR1 Phase 1: additive persistence foundation only.
-- No backfill, legacy mutation, workflow, acceptance or authorization cutover.

create index people_company_user_lookup_idx
on public.people(company_id, user_id)
where user_id is not null;

create table public.tenant_access_operations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  operation text not null check (operation in (
    'invite_issue',
    'invite_resend',
    'invite_revoke',
    'invite_accept',
    'membership_role_change',
    'membership_deactivate',
    'person_link',
    'person_unlink',
    'ownership_transfer',
    'tenant_select'
  )),
  idempotency_key text not null check (btrim(idempotency_key) <> ''),
  intent_fingerprint text not null check (btrim(intent_fingerprint) <> ''),
  correlation_id uuid not null,
  status text not null default 'reserved'
    check (status in ('reserved', 'succeeded', 'failed')),
  failure_code text,
  result jsonb not null default '{}'::jsonb
    check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint tenant_access_operations_id_company_key unique (id, company_id),
  constraint tenant_access_operations_idempotency_key unique (
    company_id,
    actor_user_id,
    operation,
    idempotency_key
  ),
  constraint tenant_access_operations_state_check check (
    (status = 'reserved' and completed_at is null and failure_code is null)
    or (status = 'succeeded' and completed_at is not null and failure_code is null)
    or (
      status = 'failed'
      and completed_at is not null
      and nullif(btrim(failure_code), '') is not null
    )
  )
);

create index tenant_access_operations_correlation_idx
on public.tenant_access_operations(company_id, correlation_id);

create table public.company_member_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  person_id uuid not null,
  target_email_normalized text not null check (
    target_email_normalized = lower(btrim(target_email_normalized))
    and target_email_normalized <> ''
  ),
  intended_role text not null check (
    intended_role in ('owner', 'admin', 'hr', 'manager', 'employee')
  ),
  token_digest bytea not null check (octet_length(token_digest) = 32),
  generation integer not null default 1 check (generation > 0),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'expired', 'revoked')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by_actor_user_id uuid not null
    references auth.users(id) on delete restrict,
  created_operation_id uuid not null,
  idempotency_key text not null check (btrim(idempotency_key) <> ''),
  intent_fingerprint text not null check (btrim(intent_fingerprint) <> ''),
  correlation_id uuid not null,
  revoked_at timestamptz,
  revoked_by_actor_user_id uuid references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  accepted_by_user_id uuid references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now(),
  constraint company_member_invitations_id_company_key unique (id, company_id),
  constraint company_member_invitations_person_fkey
    foreign key (person_id, company_id)
    references public.people(id, company_id)
    on delete restrict,
  constraint company_member_invitations_created_operation_fkey
    foreign key (created_operation_id, company_id)
    references public.tenant_access_operations(id, company_id)
    on delete restrict,
  constraint company_member_invitations_creation_idempotency_key unique (
    company_id,
    created_by_actor_user_id,
    idempotency_key
  ),
  constraint company_member_invitations_expiry_check
    check (expires_at > created_at),
  constraint company_member_invitations_state_check check (
    (
      status in ('pending', 'expired')
      and accepted_at is null
      and accepted_by_user_id is null
      and revoked_at is null
      and revoked_by_actor_user_id is null
    )
    or (
      status = 'accepted'
      and accepted_at is not null
      and accepted_by_user_id is not null
      and accepted_at <= expires_at
      and revoked_at is null
      and revoked_by_actor_user_id is null
    )
    or (
      status = 'revoked'
      and revoked_at is not null
      and revoked_by_actor_user_id is not null
      and accepted_at is null
      and accepted_by_user_id is null
    )
  )
);

create unique index company_member_invitations_token_digest_key
on public.company_member_invitations(token_digest);

create unique index company_member_invitations_pending_person_key
on public.company_member_invitations(company_id, person_id)
where status = 'pending';

create unique index company_member_invitations_pending_email_key
on public.company_member_invitations(company_id, target_email_normalized)
where status = 'pending';

create index company_member_invitations_pending_expiry_idx
on public.company_member_invitations(company_id, expires_at)
where status = 'pending';

create table public.tenant_access_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  operation_id uuid not null,
  event_type text not null check (event_type in (
    'invite.created',
    'invite.resent',
    'invite.revoked',
    'invite.accepted',
    'membership.created',
    'membership.role_changed',
    'person.linked',
    'person.unlinked',
    'membership.deactivated',
    'tenant.selected'
  )),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  executor_type text not null
    check (executor_type in ('authenticated', 'service_role', 'system')),
  executor_id text not null check (btrim(executor_id) <> ''),
  target_type text not null check (target_type in (
    'invitation',
    'membership',
    'person',
    'company',
    'tenant_preference'
  )),
  target_id uuid not null,
  target_user_id uuid references auth.users(id) on delete restrict,
  correlation_id uuid not null,
  outcome text not null
    check (outcome in ('succeeded', 'failed', 'denied', 'conflict')),
  reason_code text check (
    reason_code is null
    or reason_code ~ '^[A-Z][A-Z0-9_]{2,79}$'
  ),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  constraint tenant_access_audit_events_operation_fkey
    foreign key (operation_id, company_id)
    references public.tenant_access_operations(id, company_id)
    on delete restrict
);

create index tenant_access_audit_events_company_time_idx
on public.tenant_access_audit_events(company_id, occurred_at desc);

create index tenant_access_audit_events_operation_idx
on public.tenant_access_audit_events(operation_id, company_id, occurred_at);

create or replace function public.protect_tenant_access_audit_event()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'TENANT_ACCESS_AUDIT_APPEND_ONLY';
end;
$$;

create trigger protect_tenant_access_audit_events
before update or delete on public.tenant_access_audit_events
for each row execute function public.protect_tenant_access_audit_event();

alter table public.tenant_access_operations enable row level security;
alter table public.company_member_invitations enable row level security;
alter table public.tenant_access_audit_events enable row level security;

revoke all on table
  public.tenant_access_operations,
  public.company_member_invitations,
  public.tenant_access_audit_events
from public, anon, authenticated;

grant select, insert, update on table
  public.tenant_access_operations,
  public.company_member_invitations
to service_role;

grant select, insert on table public.tenant_access_audit_events
to service_role;

revoke all on function public.protect_tenant_access_audit_event() from public;
