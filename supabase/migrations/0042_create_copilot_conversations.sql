create table public.copilot_conversations (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  created_by uuid not null
    default auth.uid()
    references auth.users(id)
    on delete cascade,

  title text not null
    default 'Nova conversa'
    check (
      char_length(trim(title)) between 1 and 200
    ),

  context_type text not null
    default 'global'
    check (
      context_type in (
        'global',
        'employee',
        'position',
        'department',
        'team',
        'assessment',
        'development-plan',
        'recruitment',
        'payroll',
        'executive-dashboard'
      )
    ),

  context_id uuid null,

  status text not null
    default 'active'
    check (
      status in (
        'active',
        'archived'
      )
    ),

  created_at timestamptz not null
    default now(),

  updated_at timestamptz not null
    default now(),

  constraint copilot_conversations_context_reference_check
    check (
      (
        context_type = 'global'
        and context_id is null
      )
      or
      context_type <> 'global'
    )
);

comment on table public.copilot_conversations is
  'Conversas do Evol AI Copilot vinculadas a uma empresa, usuário e contexto funcional.';

comment on column public.copilot_conversations.company_id is
  'Empresa proprietária da conversa.';

comment on column public.copilot_conversations.created_by is
  'Usuário autenticado que criou e controla a conversa.';

comment on column public.copilot_conversations.context_type is
  'Tipo de contexto funcional associado à conversa.';

comment on column public.copilot_conversations.context_id is
  'Identificador opcional da entidade associada ao contexto da conversa.';

comment on column public.copilot_conversations.status is
  'Estado atual da conversa: active ou archived.';

create index copilot_conversations_company_user_updated_idx
  on public.copilot_conversations (
    company_id,
    created_by,
    updated_at desc
  );

create index copilot_conversations_company_context_idx
  on public.copilot_conversations (
    company_id,
    context_type,
    context_id,
    updated_at desc
  );

create index copilot_conversations_active_idx
  on public.copilot_conversations (
    company_id,
    created_by,
    updated_at desc
  )
  where status = 'active';

create table public.copilot_conversation_messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.copilot_conversations(id)
    on delete cascade,

  role text not null
    check (
      role in (
        'user',
        'assistant',
        'system'
      )
    ),

  content text not null
    check (
      char_length(trim(content)) > 0
    ),

  status text not null
    default 'completed'
    check (
      status in (
        'pending',
        'completed',
        'failed'
      )
    ),

  metadata jsonb not null
    default '{}'::jsonb
    check (
      jsonb_typeof(metadata) = 'object'
    ),

  input_tokens integer null
    check (
      input_tokens is null
      or input_tokens >= 0
    ),

  output_tokens integer null
    check (
      output_tokens is null
      or output_tokens >= 0
    ),

  created_at timestamptz not null
    default now()
);

comment on table public.copilot_conversation_messages is
  'Mensagens pertencentes às conversas do Evol AI Copilot.';

comment on column public.copilot_conversation_messages.role is
  'Papel responsável pela mensagem: user, assistant ou system.';

comment on column public.copilot_conversation_messages.status is
  'Estado de processamento da mensagem: pending, completed ou failed.';

comment on column public.copilot_conversation_messages.metadata is
  'Metadados estruturados da execução, incluindo skill, modelo, citações e contexto.';

comment on column public.copilot_conversation_messages.input_tokens is
  'Quantidade de tokens de entrada registrada pelo provedor de IA.';

comment on column public.copilot_conversation_messages.output_tokens is
  'Quantidade de tokens de saída registrada pelo provedor de IA.';

create index copilot_messages_conversation_created_idx
  on public.copilot_conversation_messages (
    conversation_id,
    created_at asc,
    id asc
  );

create or replace function public.update_copilot_conversation_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger update_copilot_conversation_updated_at
before update
on public.copilot_conversations
for each row
execute function public.update_copilot_conversation_updated_at();

create or replace function public.touch_copilot_conversation_from_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.copilot_conversations
  set updated_at = now()
  where id = coalesce(new.conversation_id, old.conversation_id);

  return coalesce(new, old);
end;
$$;

create trigger touch_copilot_conversation_after_message_insert
after insert
on public.copilot_conversation_messages
for each row
execute function public.touch_copilot_conversation_from_message();

create trigger touch_copilot_conversation_after_message_update
after update
on public.copilot_conversation_messages
for each row
execute function public.touch_copilot_conversation_from_message();

create trigger touch_copilot_conversation_after_message_delete
after delete
on public.copilot_conversation_messages
for each row
execute function public.touch_copilot_conversation_from_message();

alter table public.copilot_conversations
  enable row level security;

alter table public.copilot_conversation_messages
  enable row level security;

create policy "users can read own copilot conversations"
on public.copilot_conversations
for select
using (
  created_by = auth.uid()
  and public.is_company_member(company_id)
);

create policy "users can create own copilot conversations"
on public.copilot_conversations
for insert
with check (
  created_by = auth.uid()
  and public.is_company_member(company_id)
);

create policy "users can update own copilot conversations"
on public.copilot_conversations
for update
using (
  created_by = auth.uid()
  and public.is_company_member(company_id)
)
with check (
  created_by = auth.uid()
  and public.is_company_member(company_id)
);

create policy "users can delete own copilot conversations"
on public.copilot_conversations
for delete
using (
  created_by = auth.uid()
  and public.is_company_member(company_id)
);

create policy "users can read messages from own copilot conversations"
on public.copilot_conversation_messages
for select
using (
  exists (
    select 1
    from public.copilot_conversations conversation
    where conversation.id = conversation_id
      and conversation.created_by = auth.uid()
      and public.is_company_member(
        conversation.company_id
      )
  )
);

create policy "users can create messages in own copilot conversations"
on public.copilot_conversation_messages
for insert
with check (
  exists (
    select 1
    from public.copilot_conversations conversation
    where conversation.id = conversation_id
      and conversation.created_by = auth.uid()
      and public.is_company_member(
        conversation.company_id
      )
  )
);

create policy "users can update messages in own copilot conversations"
on public.copilot_conversation_messages
for update
using (
  exists (
    select 1
    from public.copilot_conversations conversation
    where conversation.id = conversation_id
      and conversation.created_by = auth.uid()
      and public.is_company_member(
        conversation.company_id
      )
  )
)
with check (
  exists (
    select 1
    from public.copilot_conversations conversation
    where conversation.id = conversation_id
      and conversation.created_by = auth.uid()
      and public.is_company_member(
        conversation.company_id
      )
  )
);

create policy "users can delete messages from own copilot conversations"
on public.copilot_conversation_messages
for delete
using (
  exists (
    select 1
    from public.copilot_conversations conversation
    where conversation.id = conversation_id
      and conversation.created_by = auth.uid()
      and public.is_company_member(
        conversation.company_id
      )
  )
);
