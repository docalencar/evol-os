-- E5-DB1: trusted Assessment Feedback mutation boundary.
--
-- Five purpose-bound functions become the only human write path for Assessment
-- Feedback. The actor, both participants, the company, the type, the visibility,
-- the initial status and the title are derived server-side; direct DML on the
-- whole Feedback aggregate is closed; every accepted transition writes its audit
-- inside the same transaction.
--
-- Two decisions are recorded here because they are visible in the SQL and would
-- otherwise look like omissions.
--
-- TITLE (F9). The title is always the neutral `Feedback da avaliação`. The plan
-- allows `Feedback — <cycle name>` only when the cycle name is already
-- legitimately observable by BOTH participants through the canonical Assessment
-- boundary for that response. That proof does not exist today: the catalog read
-- is administrative, and `get_current_person_assessment_result_directory_v1`
-- (0117) proves the name only for the person's OWN result and only while
-- `assessment_visibility <> 'none'` — it says nothing about the evaluator. Since
-- the rule is fail-closed and no new authorization may be invented for a title,
-- the neutral form is the only one this slice can justify. E5-P1 may enrich it
-- once a read model proves both participants' access.
--
-- ATTACHMENTS AND MENTIONS (F12). They stay functionally deferred: no RPC, no
-- UI, no new behaviour. But they belong to the Feedback aggregate, so leaving
-- their direct INSERT/UPDATE/DELETE open would reopen exactly the bypass this
-- boundary closes. Their write privileges and write policies are removed with
-- the other three tables; their reads are untouched.

-- ---------------------------------------------------------------------------
-- Fail-closed preflight.
--
-- Only the conditions that would make the transformation itself unsafe, and
-- that the migration must refuse rather than repair. The full inventory,
-- fingerprints and ACL comparison live in the PRE verifier
-- (scripts/review/verify-0128-trusted-feedback-pre.sh), not here.
-- ---------------------------------------------------------------------------
do $$
begin
  -- Existing rows that the new composite foreign keys could not validate.
  if exists (
    select 1
    from public.feedback_threads t
    left join public.people s on s.id = t.sender_employee_id and s.company_id = t.company_id
    left join public.people r on r.id = t.receiver_employee_id and r.company_id = t.company_id
    where s.id is null or r.id is null
  ) or exists (
    select 1
    from public.feedback_messages m
    left join public.feedback_threads t on t.id = m.thread_id and t.company_id = m.company_id
    left join public.people a on a.id = m.author_employee_id and a.company_id = m.company_id
    where t.id is null or (m.author_employee_id is not null and a.id is null)
  ) or exists (
    select 1
    from public.feedback_acknowledgements a
    left join public.feedback_threads t on t.id = a.thread_id and t.company_id = a.company_id
    left join public.people p on p.id = a.employee_id and p.company_id = a.company_id
    where t.id is null or p.id is null
  ) then
    raise exception using errcode = '23514', message = 'FEEDBACK_TENANT_INTEGRITY_PREFLIGHT_FAILED';
  end if;

  -- Any function of one of the five names, at any signature.
  if exists (
    select 1 from pg_proc
    where pronamespace = 'public'::regnamespace
      and proname in (
        'create_assessment_feedback_v1', 'reply_feedback_v1',
        'acknowledge_feedback_v1', 'close_feedback_v1', 'archive_feedback_v1'
      )
  ) then
    raise exception using errcode = '42710', message = 'FEEDBACK_MUTATION_FUNCTION_PREFLIGHT_FAILED';
  end if;

  -- The bridge and its uniqueness must not already exist under any shape.
  if exists (
    select 1 from pg_attribute
    where attrelid = 'public.feedback_threads'::regclass
      and attname = 'assessment_response_id'
      and not attisdropped
  ) or exists (
    select 1 from pg_class
    where relnamespace = 'public'::regnamespace
      and relname = 'feedback_threads_company_assessment_response_key'
  ) then
    raise exception using errcode = '42710', message = 'FEEDBACK_BRIDGE_PREFLIGHT_FAILED';
  end if;

  -- Constraint names this migration is about to claim.
  if exists (
    select 1 from pg_constraint
    where connamespace = 'public'::regnamespace
      and conname in (
        'assessment_responses_id_company_key',
        'feedback_threads_id_company_key',
        'feedback_messages_id_company_key',
        'feedback_threads_assessment_response_company_fkey',
        'feedback_threads_sender_company_fkey',
        'feedback_threads_receiver_company_fkey',
        'feedback_messages_thread_company_fkey',
        'feedback_messages_author_company_fkey',
        'feedback_acknowledgements_thread_company_fkey',
        'feedback_acknowledgements_employee_company_fkey'
      )
  ) then
    raise exception using errcode = '42710', message = 'FEEDBACK_CONSTRAINT_NAME_PREFLIGHT_FAILED';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bridge, candidate keys and same-tenant referential integrity (ADR-0012).
-- ---------------------------------------------------------------------------
alter table public.assessment_responses
  add constraint assessment_responses_id_company_key unique (id, company_id);

alter table public.feedback_threads
  add column assessment_response_id uuid;

comment on column public.feedback_threads.assessment_response_id is
  'Origem canônica moderna do Feedback de Avaliação. O legado assessment_id é preservado e nunca inferido para linhas históricas.';

-- PostgreSQL uniqueness, not check-then-insert, enforces the approved 0..1
-- cardinality. Company is in the key to document tenant scope; the composite
-- foreign key already guarantees the response belongs to the same company.
create unique index feedback_threads_company_assessment_response_key
  on public.feedback_threads (company_id, assessment_response_id)
  where assessment_response_id is not null;

alter table public.feedback_threads
  add constraint feedback_threads_id_company_key unique (id, company_id),
  add constraint feedback_threads_assessment_response_company_fkey
    foreign key (assessment_response_id, company_id)
    references public.assessment_responses (id, company_id)
    on delete restrict not valid,
  add constraint feedback_threads_sender_company_fkey
    foreign key (sender_employee_id, company_id)
    references public.people (id, company_id)
    on delete restrict not valid,
  add constraint feedback_threads_receiver_company_fkey
    foreign key (receiver_employee_id, company_id)
    references public.people (id, company_id)
    on delete restrict not valid;

alter table public.feedback_messages
  add constraint feedback_messages_id_company_key unique (id, company_id),
  add constraint feedback_messages_thread_company_fkey
    foreign key (thread_id, company_id)
    references public.feedback_threads (id, company_id)
    on delete cascade not valid,
  add constraint feedback_messages_author_company_fkey
    foreign key (author_employee_id, company_id)
    references public.people (id, company_id)
    on delete set null (author_employee_id) not valid;

alter table public.feedback_acknowledgements
  add constraint feedback_acknowledgements_thread_company_fkey
    foreign key (thread_id, company_id)
    references public.feedback_threads (id, company_id)
    on delete cascade not valid,
  add constraint feedback_acknowledgements_employee_company_fkey
    foreign key (employee_id, company_id)
    references public.people (id, company_id)
    on delete cascade not valid;

alter table public.feedback_threads
  validate constraint feedback_threads_assessment_response_company_fkey,
  validate constraint feedback_threads_sender_company_fkey,
  validate constraint feedback_threads_receiver_company_fkey;
alter table public.feedback_messages
  validate constraint feedback_messages_thread_company_fkey,
  validate constraint feedback_messages_author_company_fkey;
alter table public.feedback_acknowledgements
  validate constraint feedback_acknowledgements_thread_company_fkey,
  validate constraint feedback_acknowledgements_employee_company_fkey;

-- The simple FKs are now strictly weaker duplicates of the composite ones.
alter table public.feedback_threads
  drop constraint feedback_threads_sender_employee_id_fkey,
  drop constraint feedback_threads_receiver_employee_id_fkey;
alter table public.feedback_messages
  drop constraint feedback_messages_thread_id_fkey,
  drop constraint feedback_messages_author_employee_id_fkey;
alter table public.feedback_acknowledgements
  drop constraint feedback_acknowledgements_thread_id_fkey,
  drop constraint feedback_acknowledgements_employee_id_fkey;

-- ---------------------------------------------------------------------------
-- create_assessment_feedback_v1
-- ---------------------------------------------------------------------------
create or replace function public.create_assessment_feedback_v1(
  p_assessment_response_id uuid,
  p_initial_message text
) returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_content text := btrim(p_initial_message);
  v_company_id uuid;
  v_response_id uuid;
  v_sender_id uuid;
  v_receiver_id uuid;
  v_thread_id uuid;
  v_message_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if v_content is null or char_length(v_content) = 0 or char_length(v_content) > 10000 then
    raise exception using errcode = '22023', message = 'FEEDBACK_CONTENT_INVALID';
  end if;

  -- One statement resolves the response, the active membership, the actor
  -- person and the eligibility rules, and locks the response. Everything the
  -- rest of the function needs is derived here; nothing is looked up twice and
  -- no membership is chosen arbitrarily, because the company comes from the
  -- selected response.
  select r.company_id, r.id, r.evaluator_id, r.employee_id
    into v_company_id, v_response_id, v_sender_id, v_receiver_id
  from public.assessment_responses r
  join public.company_members cm
    on cm.company_id = r.company_id and cm.user_id = v_user_id and cm.status = 'active'
  join public.people actor
    on actor.company_id = r.company_id and actor.user_id = v_user_id
   and actor.status = 'active' and actor.id = r.evaluator_id
  where r.id = p_assessment_response_id
    and r.perspective = 'manager'
    and r.status in ('submitted', 'completed')
  for update of r;

  -- Foreign, same-tenant inaccessible, ineligible and nonexistent selectors all
  -- arrive here, and all leave with the same result.
  if v_company_id is null then
    raise exception using errcode = 'P0002', message = 'FEEDBACK_RESOURCE_UNAVAILABLE';
  end if;

  if v_sender_id = v_receiver_id
    or not exists (
      select 1 from public.people p
      where p.id = v_receiver_id and p.company_id = v_company_id and p.status = 'active'
    ) then
    raise exception using errcode = 'P0002', message = 'FEEDBACK_RESOURCE_UNAVAILABLE';
  end if;

  -- Authorization is complete before the origin is probed, so the unique bridge
  -- can never answer a question the caller was not already entitled to ask.
  select t.id into v_thread_id
  from public.feedback_threads t
  where t.company_id = v_company_id
    and t.assessment_response_id = v_response_id;
  if v_thread_id is not null then
    return jsonb_build_object(
      'status', 'already_exists', 'feedbackThreadId', v_thread_id
    );
  end if;

  -- Narrow handler (F7): only the origin insert may answer `already_exists`. A
  -- unique violation anywhere else stays a real failure and aborts.
  begin
    insert into public.feedback_threads (
      company_id, sender_employee_id, receiver_employee_id, created_by_user_id,
      assessment_response_id, type, status, priority, visibility, title
    ) values (
      v_company_id, v_sender_id, v_receiver_id, v_user_id,
      v_response_id, 'feedback', 'awaiting_acknowledgement', 'normal', 'participants',
      'Feedback da avaliação'
    ) returning id into v_thread_id;
  exception
    when unique_violation then
      select t.id into v_thread_id
      from public.feedback_threads t
      where t.company_id = v_company_id
        and t.assessment_response_id = v_response_id;
      if v_thread_id is null then
        raise;
      end if;
      return jsonb_build_object(
        'status', 'already_exists', 'feedbackThreadId', v_thread_id
      );
  end;

  insert into public.feedback_messages (
    company_id, thread_id, author_employee_id, created_by_user_id, type, content, metadata
  ) values (
    v_company_id, v_thread_id, v_sender_id, v_user_id, 'message', v_content, '{}'::jsonb
  ) returning id into v_message_id;

  insert into public.activity_events (
    company_id, activity_type, module, title, actor_type, actor_id,
    entity_type, entity_id, visibility, metadata
  ) values (
    v_company_id, 'feedback.created', 'feedback', 'Feedback criado', 'user', v_user_id,
    'feedback_thread', v_thread_id, 'restricted', jsonb_build_object('operation', 'create')
  );

  return jsonb_build_object(
    'status', 'created', 'feedbackThreadId', v_thread_id, 'feedbackMessageId', v_message_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- reply_feedback_v1
-- ---------------------------------------------------------------------------
create or replace function public.reply_feedback_v1(
  p_thread_id uuid,
  p_content text
) returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_content text := btrim(p_content);
  v_company_id uuid;
  v_thread_id uuid;
  v_status text;
  v_actor_id uuid;
  v_message_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if v_content is null or char_length(v_content) = 0 or char_length(v_content) > 10000 then
    raise exception using errcode = '22023', message = 'FEEDBACK_CONTENT_INVALID';
  end if;

  -- The actor person is resolved by the same locking statement that authorizes
  -- the mutation (F8): one resolution, one row, no second lookup that could
  -- diverge or raise on an unexpected duplicate.
  select t.company_id, t.id, t.status, p.id
    into v_company_id, v_thread_id, v_status, v_actor_id
  from public.feedback_threads t
  join public.company_members cm
    on cm.company_id = t.company_id and cm.user_id = v_user_id and cm.status = 'active'
  join public.people p
    on p.company_id = t.company_id and p.user_id = v_user_id and p.status = 'active'
   and p.id in (t.sender_employee_id, t.receiver_employee_id)
  where t.id = p_thread_id
  for update of t;

  if v_thread_id is null then
    raise exception using errcode = 'P0002', message = 'FEEDBACK_RESOURCE_UNAVAILABLE';
  end if;
  if v_status not in ('awaiting_acknowledgement', 'acknowledged') then
    raise exception using errcode = '55000', message = 'FEEDBACK_STATE_TRANSITION_DENIED';
  end if;

  insert into public.feedback_messages (
    company_id, thread_id, author_employee_id, created_by_user_id, type, content, metadata
  ) values (
    v_company_id, v_thread_id, v_actor_id, v_user_id, 'message', v_content, '{}'::jsonb
  ) returning id into v_message_id;

  insert into public.activity_events (
    company_id, activity_type, module, title, actor_type, actor_id,
    entity_type, entity_id, visibility, metadata
  ) values (
    v_company_id, 'feedback.replied', 'feedback', 'Feedback respondido', 'user', v_user_id,
    'feedback_thread', v_thread_id, 'restricted', jsonb_build_object('operation', 'reply')
  );

  return jsonb_build_object(
    'status', 'replied', 'feedbackThreadId', v_thread_id, 'feedbackMessageId', v_message_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- acknowledge_feedback_v1 — receiver only.
-- ---------------------------------------------------------------------------
create or replace function public.acknowledge_feedback_v1(
  p_thread_id uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_thread_id uuid;
  v_status text;
  v_actor_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select t.company_id, t.id, t.status, p.id
    into v_company_id, v_thread_id, v_status, v_actor_id
  from public.feedback_threads t
  join public.company_members cm
    on cm.company_id = t.company_id and cm.user_id = v_user_id and cm.status = 'active'
  join public.people p
    on p.company_id = t.company_id and p.user_id = v_user_id and p.status = 'active'
   and p.id = t.receiver_employee_id
  where t.id = p_thread_id
  for update of t;

  -- A sender reaching this function is not a participant OF THIS OPERATION, so
  -- they receive the same unavailable result as a stranger: acknowledgement
  -- state is not disclosed to anyone who may not perform it.
  if v_thread_id is null then
    raise exception using errcode = 'P0002', message = 'FEEDBACK_RESOURCE_UNAVAILABLE';
  end if;

  if v_status = 'acknowledged' then
    return jsonb_build_object(
      'status', 'already_acknowledged', 'feedbackThreadId', v_thread_id,
      'threadStatus', v_status
    );
  end if;
  if v_status <> 'awaiting_acknowledgement' then
    raise exception using errcode = '55000', message = 'FEEDBACK_STATE_TRANSITION_DENIED';
  end if;

  insert into public.feedback_acknowledgements (company_id, thread_id, employee_id)
  values (v_company_id, v_thread_id, v_actor_id)
  on conflict (thread_id, employee_id) do nothing;

  update public.feedback_threads
     set status = 'acknowledged', acknowledged_at = now(), updated_at = now()
   where id = v_thread_id;

  insert into public.activity_events (
    company_id, activity_type, module, title, actor_type, actor_id,
    entity_type, entity_id, visibility, metadata
  ) values (
    v_company_id, 'feedback.acknowledged', 'feedback', 'Feedback confirmado', 'user', v_user_id,
    'feedback_thread', v_thread_id, 'restricted', jsonb_build_object('operation', 'acknowledge')
  );

  return jsonb_build_object(
    'status', 'acknowledged', 'feedbackThreadId', v_thread_id, 'threadStatus', 'acknowledged'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- close_feedback_v1
-- ---------------------------------------------------------------------------
create or replace function public.close_feedback_v1(
  p_thread_id uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_thread_id uuid;
  v_status text;
  v_actor_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select t.company_id, t.id, t.status, p.id
    into v_company_id, v_thread_id, v_status, v_actor_id
  from public.feedback_threads t
  join public.company_members cm
    on cm.company_id = t.company_id and cm.user_id = v_user_id and cm.status = 'active'
  join public.people p
    on p.company_id = t.company_id and p.user_id = v_user_id and p.status = 'active'
   and p.id in (t.sender_employee_id, t.receiver_employee_id)
  where t.id = p_thread_id
  for update of t;

  if v_thread_id is null then
    raise exception using errcode = 'P0002', message = 'FEEDBACK_RESOURCE_UNAVAILABLE';
  end if;

  if v_status = 'closed' then
    return jsonb_build_object(
      'status', 'already_closed', 'feedbackThreadId', v_thread_id, 'threadStatus', v_status
    );
  end if;
  if v_status not in ('awaiting_acknowledgement', 'acknowledged') then
    raise exception using errcode = '55000', message = 'FEEDBACK_STATE_TRANSITION_DENIED';
  end if;

  update public.feedback_threads
     set status = 'closed', closed_at = now(), updated_at = now()
   where id = v_thread_id;

  insert into public.activity_events (
    company_id, activity_type, module, title, actor_type, actor_id,
    entity_type, entity_id, visibility, metadata
  ) values (
    v_company_id, 'feedback.closed', 'feedback', 'Feedback encerrado', 'user', v_user_id,
    'feedback_thread', v_thread_id, 'restricted', jsonb_build_object('operation', 'close')
  );

  return jsonb_build_object(
    'status', 'closed', 'feedbackThreadId', v_thread_id, 'threadStatus', 'closed'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- archive_feedback_v1 — closed is the only predecessor; closed_at is preserved.
-- ---------------------------------------------------------------------------
create or replace function public.archive_feedback_v1(
  p_thread_id uuid
) returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_thread_id uuid;
  v_status text;
  v_actor_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;

  select t.company_id, t.id, t.status, p.id
    into v_company_id, v_thread_id, v_status, v_actor_id
  from public.feedback_threads t
  join public.company_members cm
    on cm.company_id = t.company_id and cm.user_id = v_user_id and cm.status = 'active'
  join public.people p
    on p.company_id = t.company_id and p.user_id = v_user_id and p.status = 'active'
   and p.id in (t.sender_employee_id, t.receiver_employee_id)
  where t.id = p_thread_id
  for update of t;

  if v_thread_id is null then
    raise exception using errcode = 'P0002', message = 'FEEDBACK_RESOURCE_UNAVAILABLE';
  end if;

  if v_status = 'archived' then
    return jsonb_build_object(
      'status', 'already_archived', 'feedbackThreadId', v_thread_id, 'threadStatus', v_status
    );
  end if;
  if v_status <> 'closed' then
    raise exception using errcode = '55000', message = 'FEEDBACK_STATE_TRANSITION_DENIED';
  end if;

  update public.feedback_threads
     set status = 'archived', updated_at = now()
   where id = v_thread_id;

  insert into public.activity_events (
    company_id, activity_type, module, title, actor_type, actor_id,
    entity_type, entity_id, visibility, metadata
  ) values (
    v_company_id, 'feedback.archived', 'feedback', 'Feedback arquivado', 'user', v_user_id,
    'feedback_thread', v_thread_id, 'restricted', jsonb_build_object('operation', 'archive')
  );

  return jsonb_build_object(
    'status', 'archived', 'feedbackThreadId', v_thread_id, 'threadStatus', 'archived'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Activity hardening.
--
-- Identical to the 0084 definition — same signature, return shape, language,
-- volatility, search path — with one added predicate. `create or replace`
-- preserves the existing ACL. Restricted rows, which now include every Feedback
-- audit event, stop reaching the company timeline; the entity timeline (0086 /
-- 0095) already filtered them, and direct SELECT on activity_events remains
-- closed to authenticated.
-- ---------------------------------------------------------------------------
create or replace function public.get_tenant_activity_timeline_v1(p_company_id uuid,p_limit integer default 20)
returns table(activity_id uuid,activity_type text,module text,title text,description text,
  actor_type text,actor_id uuid,entity_type text,entity_id uuid,subject_type text,
  subject_id uuid,visibility text,metadata jsonb,occurred_at timestamptz,created_at timestamptz)
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if not public.is_company_member(p_company_id) then raise exception using errcode='42501',message='TENANT_AUTHORIZATION_DENIED'; end if;
  if p_limit is null or p_limit<1 or p_limit>100 then raise exception using errcode='22023',message='ACTIVITY_LIMIT_OUT_OF_RANGE'; end if;
  return query select e.id,e.activity_type,e.module,e.title,e.description,e.actor_type,e.actor_id,
    e.entity_type,e.entity_id,e.subject_type,e.subject_id,e.visibility,e.metadata,e.occurred_at,e.created_at
  from public.activity_events e where e.company_id=p_company_id and e.visibility='company'
  order by e.occurred_at desc,e.id desc limit p_limit;
end; $$;

-- ---------------------------------------------------------------------------
-- Direct DML closure across the whole Feedback aggregate.
--
-- Write policies first: with the grants gone they are unreachable, and leaving
-- them in place would silently restore owner/admin and author write authority
-- if a table grant were ever handed back. Read policies are untouched — the
-- 0088 readers remain the public read path.
-- ---------------------------------------------------------------------------
drop policy if exists "members can create feedback threads" on public.feedback_threads;
drop policy if exists "senders and administrators can update feedback threads" on public.feedback_threads;
drop policy if exists "administrators can delete feedback threads" on public.feedback_threads;
drop policy if exists "participants can create feedback messages" on public.feedback_messages;
drop policy if exists "authors can update feedback messages" on public.feedback_messages;
drop policy if exists "authors and administrators can delete feedback messages" on public.feedback_messages;
drop policy if exists "employees can acknowledge feedback threads" on public.feedback_acknowledgements;
drop policy if exists "employees can update their acknowledgements" on public.feedback_acknowledgements;
drop policy if exists "administrators can delete feedback acknowledgements" on public.feedback_acknowledgements;
drop policy if exists "participants can create feedback attachments" on public.feedback_attachments;
drop policy if exists "uploaders and administrators can delete feedback attachments" on public.feedback_attachments;
drop policy if exists "message authors can create feedback mentions" on public.feedback_mentions;
drop policy if exists "message authors and administrators can delete feedback mentions" on public.feedback_mentions;

revoke insert, update, delete, truncate, trigger, maintain
  on public.feedback_threads, public.feedback_messages, public.feedback_acknowledgements,
     public.feedback_attachments, public.feedback_mentions
  from public, anon, authenticated;

revoke all on function public.create_assessment_feedback_v1(uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.reply_feedback_v1(uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.acknowledge_feedback_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function public.close_feedback_v1(uuid) from public,anon,authenticated,service_role;
revoke all on function public.archive_feedback_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.create_assessment_feedback_v1(uuid,text) to authenticated;
grant execute on function public.reply_feedback_v1(uuid,text) to authenticated;
grant execute on function public.acknowledge_feedback_v1(uuid) to authenticated;
grant execute on function public.close_feedback_v1(uuid) to authenticated;
grant execute on function public.archive_feedback_v1(uuid) to authenticated;

notify pgrst, 'reload schema';
