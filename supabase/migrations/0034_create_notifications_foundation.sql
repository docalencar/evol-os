create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  recipient_id uuid not null,
  activity_event_id uuid null,

  type text not null default 'information'
    check (
      type in (
        'information',
        'action_required',
        'reminder',
        'warning',
        'success'
      )
    ),

  priority text not null default 'normal'
    check (
      priority in (
        'low',
        'normal',
        'high',
        'urgent'
      )
    ),

  status text not null default 'unread'
    check (
      status in (
        'unread',
        'read',
        'archived'
      )
    ),

  title text not null,
  message text not null,

  entity_type text null,
  entity_id uuid null,

  metadata jsonb not null default '{}'::jsonb,

  read_at timestamptz null,
  archived_at timestamptz null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notifications_entity_reference_check
    check (
      (
        entity_type is null
        and entity_id is null
      )
      or
      (
        entity_type is not null
        and entity_id is not null
      )
    )
);

create index if not exists notifications_company_recipient_idx
  on public.notifications (
    company_id,
    recipient_id,
    created_at desc
  );

create index if not exists notifications_unread_idx
  on public.notifications (
    company_id,
    recipient_id,
    created_at desc
  )
  where status = 'unread';

create index if not exists notifications_activity_event_idx
  on public.notifications (activity_event_id)
  where activity_event_id is not null;

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id uuid not null,

  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  teams_enabled boolean not null default false,
  slack_enabled boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint notification_preferences_company_user_key
    unique (company_id, user_id)
);

create index if not exists notification_preferences_company_user_idx
  on public.notification_preferences (
    company_id,
    user_id
  );

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid null,

  activity_type text not null,
  title_template text not null,
  message_template text not null,

  type text not null default 'information'
    check (
      type in (
        'information',
        'action_required',
        'reminder',
        'warning',
        'success'
      )
    ),

  priority text not null default 'normal'
    check (
      priority in (
        'low',
        'normal',
        'high',
        'urgent'
      )
    ),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists notification_templates_global_activity_idx
  on public.notification_templates (activity_type)
  where company_id is null;

create unique index if not exists notification_templates_company_activity_idx
  on public.notification_templates (
    company_id,
    activity_type
  )
  where company_id is not null;

alter table public.notifications
  enable row level security;

alter table public.notification_preferences
  enable row level security;

alter table public.notification_templates
  enable row level security;
