-- Notification Domain hardening (PD-017 / ADR-0011)

do $$
begin
  if exists (
    select 1 from public.notifications n
    left join public.companies c on c.id = n.company_id
    where c.id is null
  ) then
    raise exception 'NOTIFICATION_PREFLIGHT_INVALID_COMPANY';
  end if;

  if exists (
    select 1 from public.notifications n
    left join public.company_members cm
      on cm.company_id = n.company_id and cm.user_id = n.recipient_id
    where cm.id is null
  ) then
    raise exception 'NOTIFICATION_PREFLIGHT_INVALID_RECIPIENT';
  end if;

  if exists (
    select 1 from public.notification_preferences p
    left join public.company_members cm
      on cm.company_id = p.company_id and cm.user_id = p.user_id
    where cm.id is null
  ) then
    raise exception 'NOTIFICATION_PREFLIGHT_INVALID_PREFERENCE_USER';
  end if;

  if exists (
    select 1 from public.notification_templates t
    left join public.companies c on c.id = t.company_id
    where t.company_id is not null and c.id is null
  ) then
    raise exception 'NOTIFICATION_PREFLIGHT_INVALID_TEMPLATE_COMPANY';
  end if;
end
$$;

alter table public.activity_events
  add constraint activity_events_company_id_key unique (company_id, id);

alter table public.notifications
  add constraint notifications_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade,
  add constraint notifications_company_recipient_fkey
    foreign key (company_id, recipient_id)
    references public.company_members(company_id, user_id) on delete cascade,
  add constraint notifications_company_activity_event_fkey
    foreign key (company_id, activity_event_id)
    references public.activity_events(company_id, id) on delete cascade;

alter table public.notification_preferences
  add constraint notification_preferences_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade,
  add constraint notification_preferences_company_user_fkey
    foreign key (company_id, user_id)
    references public.company_members(company_id, user_id) on delete cascade;

alter table public.notification_templates
  add constraint notification_templates_company_id_fkey
    foreign key (company_id) references public.companies(id) on delete cascade;

alter table public.notification_preferences
  alter column email_enabled set default false;

update public.notification_preferences
set
  email_enabled = false,
  push_enabled = false,
  teams_enabled = false,
  slack_enabled = false,
  updated_at = now()
where email_enabled or push_enabled or teams_enabled or slack_enabled;

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_key text not null,
  producer_key text not null
    check (producer_key in ('people.activity', 'organization.activity')),
  event_type text not null,
  source_type text not null check (source_type = 'activity'),
  source_id uuid not null,
  actor_id uuid references auth.users(id) on delete set null,
  classification text not null check (classification in ('company', 'restricted')),
  requirement text not null check (requirement in ('mandatory', 'optional')),
  type text not null
    check (type in ('information', 'action_required', 'reminder', 'warning', 'success')),
  priority text not null check (priority in ('low', 'normal', 'high', 'urgent')),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  entity_type text,
  entity_id uuid,
  subject_type text,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint notification_events_entity_reference_check check (
    (entity_type is null and entity_id is null)
    or (entity_type is not null and entity_id is not null)
  ),
  constraint notification_events_subject_reference_check check (
    (subject_type is null and subject_id is null)
    or (subject_type is not null and subject_id is not null)
  ),
  constraint notification_events_company_event_key unique (company_id, event_key),
  constraint notification_events_company_id_key unique (company_id, id),
  constraint notification_events_company_source_fkey
    foreign key (company_id, source_id)
    references public.activity_events(company_id, id) on delete restrict
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_id uuid not null,
  recipient_id uuid not null,
  channel text not null check (channel = 'in_app'),
  delivery_key text not null,
  status text not null default 'pending'
    check (status in ('pending', 'delivered', 'failed', 'cancelled')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_company_event_fkey
    foreign key (company_id, event_id)
    references public.notification_events(company_id, id) on delete cascade,
  constraint notification_deliveries_company_recipient_fkey
    foreign key (company_id, recipient_id)
    references public.company_members(company_id, user_id) on delete cascade,
  constraint notification_deliveries_company_delivery_key unique
    (company_id, delivery_key),
  constraint notification_deliveries_event_recipient_channel unique
    (company_id, event_id, recipient_id, channel),
  constraint notification_deliveries_company_id_key unique (company_id, id),
  constraint notification_deliveries_state_check check (
    (status = 'pending' and delivered_at is null and cancelled_at is null)
    or (status = 'delivered' and delivered_at is not null and cancelled_at is null)
    or (status = 'failed' and delivered_at is null and cancelled_at is null)
    or (status = 'cancelled' and delivered_at is null and cancelled_at is not null)
  )
);

create table public.notification_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  delivery_id uuid not null,
  attempt_number integer not null check (attempt_number > 0),
  outcome text not null check (outcome in ('delivered', 'failed')),
  error_code text,
  attempted_at timestamptz not null default now(),
  constraint notification_delivery_attempts_delivery_fkey
    foreign key (company_id, delivery_id)
    references public.notification_deliveries(company_id, id) on delete cascade,
  constraint notification_delivery_attempts_number_key
    unique (delivery_id, attempt_number),
  constraint notification_delivery_attempts_error_check check (
    (outcome = 'delivered' and error_code is null)
    or (outcome = 'failed' and error_code is not null)
  )
);

create table public.notification_audit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  delivery_id uuid not null,
  operation text not null
    check (operation in ('inspect', 'cancel', 'resend', 'reprocess')),
  reason_code text not null check (reason_code ~ '^[a-z][a-z0-9_]{2,79}$'),
  created_at timestamptz not null default now(),
  constraint notification_audit_delivery_fkey
    foreign key (company_id, delivery_id)
    references public.notification_deliveries(company_id, id) on delete cascade
);

alter table public.notifications add column delivery_id uuid;

alter table public.notifications
  add constraint notifications_company_delivery_fkey
    foreign key (company_id, delivery_id)
    references public.notification_deliveries(company_id, id) on delete restrict,
  add constraint notifications_delivery_id_key unique (delivery_id);

create index notification_events_source_idx
  on public.notification_events(company_id, source_id);
create index notification_deliveries_operational_idx
  on public.notification_deliveries(company_id, status, updated_at);
create index notification_delivery_attempts_delivery_idx
  on public.notification_delivery_attempts(company_id, delivery_id, attempt_number);
create index notification_audit_delivery_idx
  on public.notification_audit(company_id, delivery_id, created_at desc);

alter table public.notification_events enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_delivery_attempts enable row level security;
alter table public.notification_audit enable row level security;

drop policy if exists "recipients read own notifications" on public.notifications;
drop policy if exists "recipients update own notifications" on public.notifications;
drop policy if exists "users read own notification preferences" on public.notification_preferences;
drop policy if exists "users create own notification preferences" on public.notification_preferences;
drop policy if exists "users update own notification preferences" on public.notification_preferences;
drop policy if exists "members read notification templates" on public.notification_templates;
drop policy if exists "administrators manage company notification templates" on public.notification_templates;

create policy "recipients read own notifications"
on public.notifications for select
using (
  recipient_id = auth.uid()
  and public.is_company_member(company_id)
);

create policy "recipients update own notifications"
on public.notifications for update
using (
  recipient_id = auth.uid()
  and public.is_company_member(company_id)
)
with check (
  recipient_id = auth.uid()
  and public.is_company_member(company_id)
);

create policy "users read own notification preferences"
on public.notification_preferences for select
using (user_id = auth.uid() and public.is_company_member(company_id));

create policy "users create own notification preferences"
on public.notification_preferences for insert
with check (user_id = auth.uid() and public.is_company_member(company_id));

create policy "users update own notification preferences"
on public.notification_preferences for update
using (user_id = auth.uid() and public.is_company_member(company_id))
with check (user_id = auth.uid() and public.is_company_member(company_id));

create policy "members read notification templates"
on public.notification_templates for select
using (company_id is null or public.is_company_member(company_id));

create policy "administrators manage company notification templates"
on public.notification_templates for all
using (
  company_id is not null
  and public.has_company_role(company_id, array['owner', 'admin', 'hr'])
)
with check (
  company_id is not null
  and public.has_company_role(company_id, array['owner', 'admin', 'hr'])
);

create or replace function public.protect_notification_content()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '42501', message = 'NOTIFICATION_DELETE_FORBIDDEN';
  end if;

  if new.id is distinct from old.id
    or new.company_id is distinct from old.company_id
    or new.recipient_id is distinct from old.recipient_id
    or new.activity_event_id is distinct from old.activity_event_id
    or new.delivery_id is distinct from old.delivery_id
    or new.type is distinct from old.type
    or new.priority is distinct from old.priority
    or new.title is distinct from old.title
    or new.message is distinct from old.message
    or new.entity_type is distinct from old.entity_type
    or new.entity_id is distinct from old.entity_id
    or new.metadata is distinct from old.metadata
    or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '42501', message = 'NOTIFICATION_CONTENT_IMMUTABLE';
  end if;

  if old.status = 'archived' and new.status <> old.status then
    raise exception using errcode = '22023', message = 'NOTIFICATION_ARCHIVED_TERMINAL';
  end if;

  if new.status = 'unread' and old.status <> 'unread' then
    raise exception using errcode = '22023', message = 'NOTIFICATION_STATUS_REGRESSION';
  end if;

  if new.status = 'read' and (new.read_at is null or new.archived_at is not null) then
    raise exception using errcode = '22023', message = 'NOTIFICATION_INVALID_READ_STATE';
  end if;

  if new.status = 'archived' and new.archived_at is null then
    raise exception using errcode = '22023', message = 'NOTIFICATION_INVALID_ARCHIVE_STATE';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_notification_update
before update on public.notifications
for each row execute function public.protect_notification_content();

create trigger protect_notification_delete
before delete on public.notifications
for each row execute function public.protect_notification_content();

create or replace function public.prevent_notification_immutable_changes()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise exception using errcode = '42501', message = 'NOTIFICATION_RECORD_IMMUTABLE';
end;
$$;

create trigger prevent_notification_event_changes
before update or delete on public.notification_events
for each row execute function public.prevent_notification_immutable_changes();

create trigger prevent_notification_attempt_changes
before update or delete on public.notification_delivery_attempts
for each row execute function public.prevent_notification_immutable_changes();

create trigger prevent_notification_audit_changes
before update or delete on public.notification_audit
for each row execute function public.prevent_notification_immutable_changes();

create or replace function public.protect_notification_delivery_content()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '42501', message = 'NOTIFICATION_DELIVERY_DELETE_FORBIDDEN';
  end if;

  if new.id is distinct from old.id
    or new.company_id is distinct from old.company_id
    or new.event_id is distinct from old.event_id
    or new.recipient_id is distinct from old.recipient_id
    or new.channel is distinct from old.channel
    or new.delivery_key is distinct from old.delivery_key
    or new.created_at is distinct from old.created_at
  then
    raise exception using errcode = '42501', message = 'NOTIFICATION_DELIVERY_IMMUTABLE';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger protect_notification_delivery_update
before update on public.notification_deliveries
for each row execute function public.protect_notification_delivery_content();

create trigger protect_notification_delivery_delete
before delete on public.notification_deliveries
for each row execute function public.protect_notification_delivery_content();

create or replace function public.persist_notification_event(
  p_event jsonb,
  p_deliveries jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_activity public.activity_events%rowtype;
  v_event public.notification_events%rowtype;
  v_delivery public.notification_deliveries%rowtype;
  v_item jsonb;
  v_recipient_id uuid;
  v_delivery_ids jsonb := '[]'::jsonb;
  v_expected_recipient boolean;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'NOTIFICATION_TRUSTED_ROLE_REQUIRED';
  end if;

  if jsonb_typeof(p_event) <> 'object' or jsonb_typeof(p_deliveries) <> 'array' then
    raise exception using errcode = '22023', message = 'NOTIFICATION_INVALID_PAYLOAD';
  end if;

  select * into strict v_activity
  from public.activity_events
  where id = (p_event ->> 'source_id')::uuid
    and company_id = (p_event ->> 'company_id')::uuid;

  if p_event ->> 'source_type' <> 'activity'
    or p_event ->> 'event_type' <> v_activity.activity_type
    or p_event ->> 'classification' <> v_activity.visibility
    or p_event ->> 'classification' <> 'company'
    or p_event ->> 'requirement' <> 'optional'
    or p_event ->> 'type' <> 'information'
    or p_event ->> 'priority' <> 'normal'
    or p_event ->> 'title' <> v_activity.title
    or p_event ->> 'message' <> coalesce(v_activity.description, v_activity.title)
    or (p_event ->> 'actor_id')::uuid is distinct from v_activity.actor_id
    or p_event ->> 'entity_type' is distinct from v_activity.entity_type
    or (p_event ->> 'entity_id')::uuid is distinct from v_activity.entity_id
    or p_event ->> 'subject_type' is distinct from v_activity.subject_type
    or (p_event ->> 'subject_id')::uuid is distinct from v_activity.subject_id
    or coalesce(p_event -> 'metadata', '{}'::jsonb) <> v_activity.metadata
  then
    raise exception using errcode = '22023', message = 'NOTIFICATION_EVENT_SOURCE_MISMATCH';
  end if;

  if not (
    (p_event ->> 'producer_key' = 'people.activity'
      and v_activity.module = 'people'
      and v_activity.activity_type in ('employee.created', 'employee.updated', 'employee.archived'))
    or
    (p_event ->> 'producer_key' = 'organization.activity'
      and v_activity.module = 'organization'
      and v_activity.activity_type in (
        'team.created', 'team.updated', 'team.archived',
        'department.created', 'department.updated', 'department.archived'
      ))
  ) then
    raise exception using errcode = '22023', message = 'NOTIFICATION_PRODUCER_NOT_REGISTERED';
  end if;

  if p_event ->> 'event_key' <>
    concat(p_event ->> 'producer_key', ':', p_event ->> 'source_id')
  then
    raise exception using errcode = '22023', message = 'NOTIFICATION_INVALID_EVENT_KEY';
  end if;

  insert into public.notification_events (
    company_id, event_key, producer_key, event_type, source_type, source_id,
    actor_id, classification, requirement, type, priority, title, message,
    entity_type, entity_id, subject_type, subject_id, metadata, occurred_at
  ) values (
    (p_event ->> 'company_id')::uuid,
    p_event ->> 'event_key', p_event ->> 'producer_key', p_event ->> 'event_type',
    p_event ->> 'source_type', (p_event ->> 'source_id')::uuid,
    (p_event ->> 'actor_id')::uuid, p_event ->> 'classification',
    p_event ->> 'requirement', p_event ->> 'type', p_event ->> 'priority',
    p_event ->> 'title', p_event ->> 'message', p_event ->> 'entity_type',
    (p_event ->> 'entity_id')::uuid, p_event ->> 'subject_type',
    (p_event ->> 'subject_id')::uuid, coalesce(p_event -> 'metadata', '{}'::jsonb),
    (p_event ->> 'occurred_at')::timestamptz
  )
  on conflict (company_id, event_key) do nothing;

  select * into strict v_event
  from public.notification_events
  where company_id = (p_event ->> 'company_id')::uuid
    and event_key = p_event ->> 'event_key';

  if v_event.source_id <> v_activity.id
    or v_event.producer_key <> p_event ->> 'producer_key'
    or v_event.event_type <> p_event ->> 'event_type'
  then
    raise exception using errcode = '23505', message = 'NOTIFICATION_EVENT_KEY_CONFLICT';
  end if;

  for v_item in select value from jsonb_array_elements(p_deliveries)
  loop
    v_recipient_id := (v_item ->> 'recipient_id')::uuid;

    if v_item ->> 'channel' <> 'in_app'
      or v_item ->> 'delivery_key' <>
        concat(v_event.event_key, ':', v_recipient_id::text, ':in_app')
    then
      raise exception using errcode = '22023', message = 'NOTIFICATION_INVALID_DELIVERY';
    end if;

    if v_recipient_id is not distinct from v_event.actor_id then
      raise exception using errcode = '42501', message = 'NOTIFICATION_ACTOR_RECIPIENT_FORBIDDEN';
    end if;

    select case
      when v_activity.activity_type in ('employee.created', 'employee.archived') then
        exists (
          select 1 from public.people employee
          join public.people manager on manager.id = employee.manager_id
            and manager.company_id = employee.company_id
          join public.company_members cm on cm.company_id = manager.company_id
            and cm.user_id = manager.user_id and cm.status = 'active'
          where employee.id = coalesce(v_activity.subject_id, v_activity.entity_id)
            and employee.company_id = v_activity.company_id
            and cm.user_id = v_recipient_id
        )
      when v_activity.activity_type = 'employee.updated' then
        exists (
          select 1 from public.people employee
          left join public.people manager on manager.id = employee.manager_id
            and manager.company_id = employee.company_id
          join public.company_members cm on cm.company_id = employee.company_id
            and cm.status = 'active'
            and cm.user_id in (employee.user_id, manager.user_id)
          where employee.id = coalesce(v_activity.subject_id, v_activity.entity_id)
            and employee.company_id = v_activity.company_id
            and cm.user_id = v_recipient_id
        )
      when v_activity.entity_type = 'team' then
        exists (
          select 1 from public.teams team
          join public.people leader on leader.id = team.manager_id
            and leader.company_id = team.company_id
          join public.company_members cm on cm.company_id = leader.company_id
            and cm.user_id = leader.user_id and cm.status = 'active'
          where team.id = v_activity.entity_id
            and team.company_id = v_activity.company_id
            and cm.user_id = v_recipient_id
        )
      when v_activity.entity_type = 'department' then
        exists (
          select 1 from public.departments department
          join public.people leader on leader.id = department.manager_id
            and leader.company_id = department.company_id
          join public.company_members cm on cm.company_id = leader.company_id
            and cm.user_id = leader.user_id and cm.status = 'active'
          where department.id = v_activity.entity_id
            and department.company_id = v_activity.company_id
            and cm.user_id = v_recipient_id
        )
      else false
    end into v_expected_recipient;

    if not coalesce(v_expected_recipient, false) then
      raise exception using errcode = '42501', message = 'NOTIFICATION_RECIPIENT_INVALID';
    end if;

    if v_event.requirement = 'optional' and exists (
      select 1 from public.notification_preferences preference
      where preference.company_id = v_event.company_id
        and preference.user_id = v_recipient_id
        and not preference.in_app_enabled
    ) then
      raise exception using errcode = '42501', message = 'NOTIFICATION_PREFERENCE_SUPPRESSED';
    end if;

    insert into public.notification_deliveries (
      company_id, event_id, recipient_id, channel, delivery_key
    ) values (
      v_event.company_id, v_event.id, v_recipient_id,
      v_item ->> 'channel', v_item ->> 'delivery_key'
    )
    on conflict (company_id, delivery_key) do nothing;

    select * into strict v_delivery
    from public.notification_deliveries
    where company_id = v_event.company_id
      and delivery_key = v_item ->> 'delivery_key'
    for update;

    if v_delivery.event_id <> v_event.id
      or v_delivery.recipient_id <> v_recipient_id
      or v_delivery.channel <> v_item ->> 'channel'
    then
      raise exception using errcode = '23505', message = 'NOTIFICATION_DELIVERY_KEY_CONFLICT';
    end if;

    if v_delivery.status in ('pending', 'failed') then
      insert into public.notification_delivery_attempts (
        company_id, delivery_id, attempt_number, outcome
      ) values (
        v_delivery.company_id, v_delivery.id, v_delivery.attempt_count + 1, 'delivered'
      );

      insert into public.notifications (
        company_id, recipient_id, activity_event_id, delivery_id,
        type, priority, status, title, message, entity_type, entity_id, metadata
      ) values (
        v_event.company_id, v_delivery.recipient_id, v_event.source_id, v_delivery.id,
        v_event.type, v_event.priority, 'unread', v_event.title, v_event.message,
        v_event.entity_type, v_event.entity_id, v_event.metadata
      )
      on conflict (delivery_id) do nothing;

      update public.notification_deliveries
      set status = 'delivered', attempt_count = attempt_count + 1,
        last_error_code = null, delivered_at = now(), cancelled_at = null
      where id = v_delivery.id;
    end if;

    v_delivery_ids := v_delivery_ids || to_jsonb(v_delivery.id::text);
  end loop;

  return jsonb_build_object(
    'event_id', v_event.id,
    'delivery_ids', v_delivery_ids
  );
end;
$$;

create or replace function public.audit_notification_operation(
  p_company_id uuid,
  p_delivery_id uuid,
  p_operation text,
  p_reason_code text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.has_company_role(
    p_company_id, array['owner', 'admin']
  ) then
    raise exception using errcode = '42501', message = 'NOTIFICATION_ADMIN_PERMISSION_DENIED';
  end if;

  if p_reason_code !~ '^[a-z][a-z0-9_]{2,79}$' then
    raise exception using errcode = '22023', message = 'NOTIFICATION_INVALID_REASON';
  end if;

  insert into public.notification_audit (
    company_id, actor_id, delivery_id, operation, reason_code
  ) values (
    p_company_id, auth.uid(), p_delivery_id, p_operation, p_reason_code
  );
end;
$$;

create or replace function public.read_notification_delivery_metadata(
  p_company_id uuid,
  p_delivery_id uuid,
  p_reason_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  perform public.audit_notification_operation(
    p_company_id, p_delivery_id, 'inspect', p_reason_code
  );

  select jsonb_build_object(
    'delivery_id', d.id,
    'event_id', d.event_id,
    'producer_key', e.producer_key,
    'event_key', e.event_key,
    'status', d.status,
    'channel', d.channel,
    'attempt_count', d.attempt_count,
    'last_error_code', d.last_error_code,
    'created_at', d.created_at,
    'updated_at', d.updated_at,
    'delivered_at', d.delivered_at,
    'cancelled_at', d.cancelled_at
  ) into v_result
  from public.notification_deliveries d
  join public.notification_events e on e.id = d.event_id
  where d.id = p_delivery_id and d.company_id = p_company_id;

  if v_result is null then
    raise exception using errcode = 'P0002', message = 'NOTIFICATION_DELIVERY_NOT_FOUND';
  end if;

  return v_result;
end;
$$;

create or replace function public.cancel_notification_delivery(
  p_company_id uuid,
  p_delivery_id uuid,
  p_reason_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  perform public.audit_notification_operation(
    p_company_id, p_delivery_id, 'cancel', p_reason_code
  );

  update public.notification_deliveries
  set status = 'cancelled', cancelled_at = now(), delivered_at = null
  where id = p_delivery_id and company_id = p_company_id
    and status in ('pending', 'failed');
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.reprocess_notification_delivery(
  p_company_id uuid,
  p_delivery_id uuid,
  p_reason_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  perform public.audit_notification_operation(
    p_company_id, p_delivery_id, 'reprocess', p_reason_code
  );

  update public.notification_deliveries
  set status = 'pending', last_error_code = null
  where id = p_delivery_id and company_id = p_company_id and status = 'failed';
  get diagnostics v_count = row_count;
  return v_count = 1;
end;
$$;

create or replace function public.resend_notification_delivery(
  p_company_id uuid,
  p_delivery_id uuid,
  p_reason_code text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_exists boolean;
begin
  perform public.audit_notification_operation(
    p_company_id, p_delivery_id, 'resend', p_reason_code
  );

  select exists (
    select 1 from public.notification_deliveries
    where id = p_delivery_id and company_id = p_company_id and status = 'delivered'
  ) into v_exists;
  return v_exists;
end;
$$;

revoke all on table public.notifications,
  public.notification_preferences,
  public.notification_templates,
  public.notification_events,
  public.notification_deliveries,
  public.notification_delivery_attempts,
  public.notification_audit
from anon, authenticated;

grant select on public.notifications to authenticated;
grant update (status, read_at, archived_at, updated_at)
  on public.notifications to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.notification_templates to authenticated;

grant all on table public.notifications,
  public.notification_preferences,
  public.notification_templates,
  public.notification_events,
  public.notification_deliveries,
  public.notification_delivery_attempts,
  public.notification_audit
to service_role;

revoke all on function public.persist_notification_event(jsonb, jsonb) from public;
revoke all on function public.audit_notification_operation(uuid, uuid, text, text) from public;
revoke all on function public.read_notification_delivery_metadata(uuid, uuid, text) from public;
revoke all on function public.cancel_notification_delivery(uuid, uuid, text) from public;
revoke all on function public.reprocess_notification_delivery(uuid, uuid, text) from public;
revoke all on function public.resend_notification_delivery(uuid, uuid, text) from public;

grant execute on function public.persist_notification_event(jsonb, jsonb) to service_role;
grant execute on function public.read_notification_delivery_metadata(uuid, uuid, text) to authenticated;
grant execute on function public.cancel_notification_delivery(uuid, uuid, text) to authenticated;
grant execute on function public.reprocess_notification_delivery(uuid, uuid, text) to authenticated;
grant execute on function public.resend_notification_delivery(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
