create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  activity_type text not null
    check (char_length(trim(activity_type)) > 0),

  module text not null
    check (char_length(trim(module)) > 0),

  title text not null
    check (char_length(trim(title)) > 0),

  description text,

  actor_type text not null default 'user'
    check (
      actor_type in (
        'user',
        'system',
        'automation',
        'integration'
      )
    ),

  actor_id uuid
    references auth.users(id)
    on delete set null,

  entity_type text,
  entity_id uuid,

  subject_type text,
  subject_id uuid,

  visibility text not null default 'company'
    check (
      visibility in (
        'company',
        'restricted'
      )
    ),

  metadata jsonb not null
    default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),

  occurred_at timestamptz not null
    default now(),

  created_at timestamptz not null
    default now()
);

comment on table public.activity_events is
  'Registro imutável de atividades operacionais produzidas pelos módulos do Evol OS.';

comment on column public.activity_events.activity_type is
  'Identificador estável do evento, por exemplo people.employee.created.';

comment on column public.activity_events.module is
  'Módulo de origem da atividade, por exemplo people, organization ou development.';

comment on column public.activity_events.entity_type is
  'Tipo da entidade principal relacionada à atividade.';

comment on column public.activity_events.entity_id is
  'Identificador da entidade principal relacionada à atividade.';

comment on column public.activity_events.subject_type is
  'Tipo da pessoa ou objeto impactado pela atividade.';

comment on column public.activity_events.subject_id is
  'Identificador da pessoa ou objeto impactado pela atividade.';

create index if not exists
activity_events_company_occurred_at_idx
on public.activity_events (
  company_id,
  occurred_at desc
);

create index if not exists
activity_events_company_type_idx
on public.activity_events (
  company_id,
  activity_type
);

create index if not exists
activity_events_entity_idx
on public.activity_events (
  company_id,
  entity_type,
  entity_id
)
where entity_type is not null
  and entity_id is not null;

create index if not exists
activity_events_subject_idx
on public.activity_events (
  company_id,
  subject_type,
  subject_id
)
where subject_type is not null
  and subject_id is not null;

alter table public.activity_events
  enable row level security;

drop policy if exists
  "company members can read activity events"
  on public.activity_events;

drop policy if exists
  "company members can create activity events"
  on public.activity_events;

create policy "company members can read activity events"
on public.activity_events
for select
using (
  public.is_company_member(company_id)
);

create policy "company members can create activity events"
on public.activity_events
for insert
with check (
  public.is_company_member(company_id)
  and (
    actor_id is null
    or actor_id = auth.uid()
  )
);

create or replace function public.prevent_activity_event_changes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception
    'Activity events are immutable and cannot be updated or deleted.';
end;
$$;

drop trigger if exists
prevent_activity_event_update
on public.activity_events;

create trigger prevent_activity_event_update
before update
on public.activity_events
for each row
execute function public.prevent_activity_event_changes();

drop trigger if exists
prevent_activity_event_delete
on public.activity_events;

create trigger prevent_activity_event_delete
before delete
on public.activity_events
for each row
execute function public.prevent_activity_event_changes();

notify pgrst, 'reload schema';
