-- MVP Closure: Recruitment Phase 4 — atomic "reject job opening".
--
-- Rejecting a pending_approval opening is the negative governance path: it must,
-- in a single transaction, persist the rejection decision through the
-- event-sourced Approval Framework engine (save_approval_request, with optimistic
-- concurrency), transition the opening pending_approval -> draft (so it can be
-- corrected and resubmitted), and record the activity. The previous flow read
-- approval_requests directly (42501, via findAll AND findById) and updated
-- recruitment_job_openings directly (42501) in separate transactions.
--
-- The pending aggregate is read with the existing 0096 read boundary
-- (get_tenant_job_opening_pending_approval_v1) — no new read boundary is needed:
-- the aggregate that is rejected is the same pending request the approve path
-- rehydrates. The app rehydrates it with mapApprovalRequestToDomain, runs the
-- domain rule aggregate.decide({ outcome: 'rejected' }) (which finishes the
-- request in the 'rejected' state and preserves the decision history), and
-- serializes the decided aggregate + events with the framework serializers — the
-- engine is reused, never reimplemented in SQL.
--
-- This boundary persists that rejected aggregate via save_approval_request (which
-- enforces expected_version) AND transitions the opening + records activity, all
-- atomically. No table grants; no RLS/policy changes; actor from auth.uid();
-- tenant scoped; hardened search_path.

create or replace function public.reject_tenant_job_opening_v1(
  p_company_id uuid,
  p_job_opening_id uuid,
  p_aggregate jsonb,
  p_events jsonb,
  p_expected_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_request jsonb := p_aggregate -> 'request';
  v_decider uuid;
  v_row public.recruitment_job_openings%rowtype;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);

  -- The decided aggregate must bind to this opening/tenant and be the recruitment
  -- request now in the 'rejected' state (decide({outcome:'rejected'}) finishes it).
  if v_request is null
    or (v_request ->> 'company_id')::uuid <> p_company_id
    or coalesce(v_request ->> 'module', '') <> 'recruitment'
    or coalesce(v_request ->> 'entity_type', '') <> 'job_opening'
    or (v_request ->> 'entity_id')::uuid <> p_job_opening_id
    or coalesce(v_request ->> 'status', '') <> 'rejected'
  then
    raise exception using errcode = '22023', message = 'JOB_OPENING_REJECTION_DECISION_INVALID';
  end if;

  -- Lock the opening and require pending_approval + tenant ownership + not deleted.
  select * into v_row from public.recruitment_job_openings
    where id = p_job_opening_id and company_id = p_company_id
    for update;
  if not found or v_row.deleted_at is not null then
    raise exception using errcode = '23503', message = 'JOB_OPENING_NOT_FOUND';
  end if;
  if v_row.status <> 'pending_approval' then
    raise exception using errcode = '22023', message = 'JOB_OPENING_NOT_PENDING_APPROVAL';
  end if;

  v_decider := public.current_person_id(p_company_id);
  if v_decider is null then
    raise exception using errcode = '22023', message = 'JOB_OPENING_DECIDER_REQUIRED';
  end if;

  -- The persisting actor must be the author of the decision (identity binding).
  -- The assignment-eligibility rule (was this person the assigned approver) is
  -- enforced by the domain aggregate.decide in the application, not here.
  if not exists (
    select 1
    from jsonb_array_elements(coalesce(p_aggregate -> 'decisions', '[]'::jsonb)) elem
    where elem ->> 'actor_person_id' = v_decider::text
  ) then
    raise exception using errcode = '42501', message = 'JOB_OPENING_REJECTION_ACTOR_MISMATCH';
  end if;

  -- (1) Persist the decision via the framework engine (enforces expected_version;
  -- a stale version raises 40001 APPROVAL_VERSION_CONFLICT and rolls the tx back).
  -- The prior decision history is preserved by the aggregate serialization.
  perform public.save_approval_request(p_aggregate, coalesce(p_events, '[]'::jsonb), p_expected_version);

  -- (2) Transition the opening back to draft so it can be corrected and resubmitted.
  -- Field semantics mirror the existing reject contract: the chosen approver and
  -- approval timestamp are cleared (a resubmission re-selects the approver).
  update public.recruitment_job_openings
    set status = 'draft', approver_id = null, approved_at = null, updated_at = now()
    where id = p_job_opening_id and company_id = p_company_id and status = 'pending_approval'
    returning * into v_row;

  -- (3) Record the rejection activity (idempotency key ties it to this request version).
  insert into public.activity_events (
    company_id, activity_type, module, title, description, actor_type, actor_id,
    entity_type, entity_id, occurred_at, metadata, idempotency_key
  ) values (
    p_company_id, 'job_opening.rejected', 'recruitment', 'Vaga rejeitada',
    'A vaga "' || v_row.title || '" foi rejeitada e voltou para rascunho.', 'user', v_actor,
    'job_opening', p_job_opening_id, now(),
    jsonb_build_object('job_opening_id', p_job_opening_id, 'approval_request_id', v_request ->> 'id'),
    'recruitment:job-opening:reject:' || p_job_opening_id::text || ':' || (v_request ->> 'version')
  );

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.reject_tenant_job_opening_v1(uuid, uuid, jsonb, jsonb, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.reject_tenant_job_opening_v1(uuid, uuid, jsonb, jsonb, integer)
  to authenticated;

notify pgrst, 'reload schema';
