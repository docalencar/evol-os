-- =====================================================
-- Feedback Conversation Foundation
-- =====================================================
--
-- Este domínio representa feedback contínuo, feedforward,
-- reconhecimento, check-ins e conversas de desenvolvimento.
--
-- A tabela legada public.feedbacks permanece responsável
-- pelas devolutivas formais vinculadas às avaliações.
-- =====================================================

-- =====================================================
-- Feedback threads
-- =====================================================

create table if not exists public.feedback_threads (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  sender_employee_id uuid not null
    references public.people(id)
    on delete restrict,

  receiver_employee_id uuid not null
    references public.people(id)
    on delete restrict,

  created_by_user_id uuid not null
    references auth.users(id)
    on delete restrict,

  assessment_id uuid
    references public.assessments(id)
    on delete set null,

  development_plan_id uuid
    references public.development_plans(id)
    on delete set null,

  competency_id uuid
    references public.competencies(id)
    on delete set null,

  type text not null default 'feedback'
    check (
      type in (
        'feedback',
        'feedforward',
        'recognition',
        'check_in',
        'one_on_one'
      )
    ),

  status text not null default 'open'
    check (
      status in (
        'open',
        'awaiting_acknowledgement',
        'acknowledged',
        'closed',
        'archived'
      )
    ),

  priority text not null default 'normal'
    check (
      priority in (
        'low',
        'normal',
        'high'
      )
    ),

  visibility text not null default 'participants'
    check (
      visibility in (
        'participants',
        'management',
        'hr'
      )
    ),

  title text not null,

  requires_follow_up boolean not null default false,

  follow_up_at timestamptz,

  acknowledged_at timestamptz,

  closed_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint feedback_threads_distinct_participants_check
    check (
      sender_employee_id <> receiver_employee_id
    ),

  constraint feedback_threads_follow_up_check
    check (
      requires_follow_up = true
      or follow_up_at is null
    ),

  constraint feedback_threads_acknowledgement_check
    check (
      status in (
        'acknowledged',
        'closed',
        'archived'
      )
      or acknowledged_at is null
    ),

  constraint feedback_threads_closed_at_check
    check (
      status in (
        'closed',
        'archived'
      )
      or closed_at is null
    )
);

create index if not exists feedback_threads_company_created_idx
  on public.feedback_threads (
    company_id,
    created_at desc
  );

create index if not exists feedback_threads_sender_created_idx
  on public.feedback_threads (
    company_id,
    sender_employee_id,
    created_at desc
  );

create index if not exists feedback_threads_receiver_created_idx
  on public.feedback_threads (
    company_id,
    receiver_employee_id,
    created_at desc
  );

create index if not exists feedback_threads_open_receiver_idx
  on public.feedback_threads (
    company_id,
    receiver_employee_id,
    created_at desc
  )
  where status in (
    'open',
    'awaiting_acknowledgement'
  );

create index if not exists feedback_threads_follow_up_idx
  on public.feedback_threads (
    company_id,
    follow_up_at
  )
  where (
    requires_follow_up = true
    and follow_up_at is not null
    and status not in (
      'closed',
      'archived'
    )
  );

create index if not exists feedback_threads_assessment_idx
  on public.feedback_threads (assessment_id)
  where assessment_id is not null;

create index if not exists feedback_threads_development_plan_idx
  on public.feedback_threads (development_plan_id)
  where development_plan_id is not null;

create index if not exists feedback_threads_competency_idx
  on public.feedback_threads (competency_id)
  where competency_id is not null;

-- =====================================================
-- Feedback messages
-- =====================================================

create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  thread_id uuid not null
    references public.feedback_threads(id)
    on delete cascade,

  author_employee_id uuid
    references public.people(id)
    on delete set null,

  created_by_user_id uuid not null
    references auth.users(id)
    on delete restrict,

  type text not null default 'message'
    check (
      type in (
        'message',
        'summary',
        'system'
      )
    ),

  content text not null,

  metadata jsonb not null default '{}'::jsonb,

  edited_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  constraint feedback_messages_content_check
    check (
      char_length(trim(content)) > 0
    ),

  constraint feedback_messages_author_check
    check (
      type = 'system'
      or author_employee_id is not null
    )
);

create index if not exists feedback_messages_thread_created_idx
  on public.feedback_messages (
    thread_id,
    created_at asc
  );

create index if not exists feedback_messages_company_created_idx
  on public.feedback_messages (
    company_id,
    created_at desc
  );

create index if not exists feedback_messages_author_created_idx
  on public.feedback_messages (
    company_id,
    author_employee_id,
    created_at desc
  )
  where author_employee_id is not null;

-- =====================================================
-- Feedback acknowledgements
-- =====================================================

create table if not exists public.feedback_acknowledgements (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  thread_id uuid not null
    references public.feedback_threads(id)
    on delete cascade,

  employee_id uuid not null
    references public.people(id)
    on delete cascade,

  acknowledged_at timestamptz not null default now(),

  created_at timestamptz not null default now(),

  constraint feedback_acknowledgements_thread_employee_key
    unique (
      thread_id,
      employee_id
    )
);

create index if not exists feedback_acknowledgements_company_employee_idx
  on public.feedback_acknowledgements (
    company_id,
    employee_id,
    acknowledged_at desc
  );

create index if not exists feedback_acknowledgements_thread_idx
  on public.feedback_acknowledgements (
    thread_id,
    acknowledged_at desc
  );

-- =====================================================
-- Feedback attachments
-- =====================================================

create table if not exists public.feedback_attachments (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  thread_id uuid not null
    references public.feedback_threads(id)
    on delete cascade,

  message_id uuid
    references public.feedback_messages(id)
    on delete cascade,

  uploaded_by_employee_id uuid
    references public.people(id)
    on delete set null,

  created_by_user_id uuid not null
    references auth.users(id)
    on delete restrict,

  file_name text not null,

  storage_path text not null,

  mime_type text,

  size_bytes bigint
    check (
      size_bytes is null
      or size_bytes >= 0
    ),

  created_at timestamptz not null default now(),

  constraint feedback_attachments_file_name_check
    check (
      char_length(trim(file_name)) > 0
    ),

  constraint feedback_attachments_storage_path_check
    check (
      char_length(trim(storage_path)) > 0
    )
);

create index if not exists feedback_attachments_thread_idx
  on public.feedback_attachments (
    thread_id,
    created_at desc
  );

create index if not exists feedback_attachments_message_idx
  on public.feedback_attachments (message_id)
  where message_id is not null;

-- =====================================================
-- Feedback mentions
-- =====================================================

create table if not exists public.feedback_mentions (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  thread_id uuid not null
    references public.feedback_threads(id)
    on delete cascade,

  message_id uuid not null
    references public.feedback_messages(id)
    on delete cascade,

  mentioned_employee_id uuid not null
    references public.people(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  constraint feedback_mentions_message_employee_key
    unique (
      message_id,
      mentioned_employee_id
    )
);

create index if not exists feedback_mentions_employee_created_idx
  on public.feedback_mentions (
    company_id,
    mentioned_employee_id,
    created_at desc
  );

create index if not exists feedback_mentions_thread_idx
  on public.feedback_mentions (thread_id);

-- =====================================================
-- Row Level Security
-- =====================================================

alter table public.feedback_threads
  enable row level security;

alter table public.feedback_messages
  enable row level security;

alter table public.feedback_acknowledgements
  enable row level security;

alter table public.feedback_attachments
  enable row level security;

alter table public.feedback_mentions
  enable row level security;

-- =====================================================
-- Feedback threads policies
-- =====================================================

create policy "members can read accessible feedback threads"
on public.feedback_threads
for select
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
  or sender_employee_id =
    public.current_person_id(company_id)
  or receiver_employee_id =
    public.current_person_id(company_id)
  or (
    visibility = 'management'
    and exists (
      select 1
      from public.people receiver
      where receiver.id =
        feedback_threads.receiver_employee_id
        and receiver.company_id =
          feedback_threads.company_id
        and receiver.manager_id =
          public.current_person_id(
            feedback_threads.company_id
          )
    )
  )
);

create policy "members can create feedback threads"
on public.feedback_threads
for insert
with check (
  public.is_company_member(company_id)
  and created_by_user_id = auth.uid()
  and (
    sender_employee_id =
      public.current_person_id(company_id)
    or public.has_company_role(
      company_id,
      array['owner', 'admin', 'hr']
    )
  )
);

create policy "senders and administrators can update feedback threads"
on public.feedback_threads
for update
using (
  sender_employee_id =
    public.current_person_id(company_id)
  or public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
)
with check (
  created_by_user_id is not null
  and (
    sender_employee_id =
      public.current_person_id(company_id)
    or public.has_company_role(
      company_id,
      array['owner', 'admin', 'hr']
    )
  )
);

create policy "administrators can delete feedback threads"
on public.feedback_threads
for delete
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

-- =====================================================
-- Feedback messages policies
-- =====================================================

create policy "members can read accessible feedback messages"
on public.feedback_messages
for select
using (
  exists (
    select 1
    from public.feedback_threads thread
    where thread.id =
      feedback_messages.thread_id
      and thread.company_id =
        feedback_messages.company_id
      and (
        public.has_company_role(
          thread.company_id,
          array['owner', 'admin', 'hr']
        )
        or thread.sender_employee_id =
          public.current_person_id(
            thread.company_id
          )
        or thread.receiver_employee_id =
          public.current_person_id(
            thread.company_id
          )
        or (
          thread.visibility = 'management'
          and exists (
            select 1
            from public.people receiver
            where receiver.id =
              thread.receiver_employee_id
              and receiver.company_id =
                thread.company_id
              and receiver.manager_id =
                public.current_person_id(
                  thread.company_id
                )
          )
        )
      )
  )
);

create policy "participants can create feedback messages"
on public.feedback_messages
for insert
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1
    from public.feedback_threads thread
    where thread.id =
      feedback_messages.thread_id
      and thread.company_id =
        feedback_messages.company_id
      and thread.status not in (
        'closed',
        'archived'
      )
      and (
        public.has_company_role(
          thread.company_id,
          array['owner', 'admin', 'hr']
        )
        or (
          author_employee_id =
            public.current_person_id(
              thread.company_id
            )
          and author_employee_id in (
            thread.sender_employee_id,
            thread.receiver_employee_id
          )
        )
      )
  )
);

create policy "authors can update feedback messages"
on public.feedback_messages
for update
using (
  (
    author_employee_id =
      public.current_person_id(company_id)
    and created_by_user_id = auth.uid()
  )
  or public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
)
with check (
  (
    author_employee_id =
      public.current_person_id(company_id)
    and created_by_user_id = auth.uid()
  )
  or public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

create policy "authors and administrators can delete feedback messages"
on public.feedback_messages
for delete
using (
  (
    author_employee_id =
      public.current_person_id(company_id)
    and created_by_user_id = auth.uid()
  )
  or public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

-- =====================================================
-- Feedback acknowledgements policies
-- =====================================================

create policy "members can read accessible feedback acknowledgements"
on public.feedback_acknowledgements
for select
using (
  exists (
    select 1
    from public.feedback_threads thread
    where thread.id =
      feedback_acknowledgements.thread_id
      and thread.company_id =
        feedback_acknowledgements.company_id
      and (
        public.has_company_role(
          thread.company_id,
          array['owner', 'admin', 'hr']
        )
        or thread.sender_employee_id =
          public.current_person_id(
            thread.company_id
          )
        or thread.receiver_employee_id =
          public.current_person_id(
            thread.company_id
          )
      )
  )
);

create policy "employees can acknowledge feedback threads"
on public.feedback_acknowledgements
for insert
with check (
  employee_id =
    public.current_person_id(company_id)
  and exists (
    select 1
    from public.feedback_threads thread
    where thread.id =
      feedback_acknowledgements.thread_id
      and thread.company_id =
        feedback_acknowledgements.company_id
      and employee_id in (
        thread.sender_employee_id,
        thread.receiver_employee_id
      )
  )
);

create policy "employees can update their acknowledgements"
on public.feedback_acknowledgements
for update
using (
  employee_id =
    public.current_person_id(company_id)
)
with check (
  employee_id =
    public.current_person_id(company_id)
);

create policy "administrators can delete feedback acknowledgements"
on public.feedback_acknowledgements
for delete
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

-- =====================================================
-- Feedback attachments policies
-- =====================================================

create policy "members can read accessible feedback attachments"
on public.feedback_attachments
for select
using (
  exists (
    select 1
    from public.feedback_threads thread
    where thread.id =
      feedback_attachments.thread_id
      and thread.company_id =
        feedback_attachments.company_id
      and (
        public.has_company_role(
          thread.company_id,
          array['owner', 'admin', 'hr']
        )
        or thread.sender_employee_id =
          public.current_person_id(
            thread.company_id
          )
        or thread.receiver_employee_id =
          public.current_person_id(
            thread.company_id
          )
      )
  )
);

create policy "participants can create feedback attachments"
on public.feedback_attachments
for insert
with check (
  created_by_user_id = auth.uid()
  and exists (
    select 1
    from public.feedback_threads thread
    where thread.id =
      feedback_attachments.thread_id
      and thread.company_id =
        feedback_attachments.company_id
      and thread.status not in (
        'closed',
        'archived'
      )
      and (
        public.has_company_role(
          thread.company_id,
          array['owner', 'admin', 'hr']
        )
        or (
          uploaded_by_employee_id =
            public.current_person_id(
              thread.company_id
            )
          and uploaded_by_employee_id in (
            thread.sender_employee_id,
            thread.receiver_employee_id
          )
        )
      )
  )
);

create policy "uploaders and administrators can delete feedback attachments"
on public.feedback_attachments
for delete
using (
  (
    uploaded_by_employee_id =
      public.current_person_id(company_id)
    and created_by_user_id = auth.uid()
  )
  or public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

-- =====================================================
-- Feedback mentions policies
-- =====================================================

create policy "members can read accessible feedback mentions"
on public.feedback_mentions
for select
using (
  exists (
    select 1
    from public.feedback_threads thread
    where thread.id =
      feedback_mentions.thread_id
      and thread.company_id =
        feedback_mentions.company_id
      and (
        public.has_company_role(
          thread.company_id,
          array['owner', 'admin', 'hr']
        )
        or thread.sender_employee_id =
          public.current_person_id(
            thread.company_id
          )
        or thread.receiver_employee_id =
          public.current_person_id(
            thread.company_id
          )
        or mentioned_employee_id =
          public.current_person_id(
            thread.company_id
          )
      )
  )
);

create policy "message authors can create feedback mentions"
on public.feedback_mentions
for insert
with check (
  exists (
    select 1
    from public.feedback_messages message
    join public.feedback_threads thread
      on thread.id = message.thread_id
    where message.id =
      feedback_mentions.message_id
      and message.thread_id =
        feedback_mentions.thread_id
      and message.company_id =
        feedback_mentions.company_id
      and thread.company_id =
        feedback_mentions.company_id
      and (
        message.author_employee_id =
          public.current_person_id(
            thread.company_id
          )
        or public.has_company_role(
          thread.company_id,
          array['owner', 'admin', 'hr']
        )
      )
  )
);

create policy "message authors and administrators can delete feedback mentions"
on public.feedback_mentions
for delete
using (
  exists (
    select 1
    from public.feedback_messages message
    where message.id =
      feedback_mentions.message_id
      and message.company_id =
        feedback_mentions.company_id
      and (
        message.author_employee_id =
          public.current_person_id(
            message.company_id
          )
        or public.has_company_role(
          message.company_id,
          array['owner', 'admin', 'hr']
        )
      )
  )
);
