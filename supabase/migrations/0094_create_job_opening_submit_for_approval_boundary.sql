-- MVP Closure: Recruitment Phase 2 — atomic "submit job opening for approval".
--
-- Transitioning a job opening draft -> pending_approval must, in a SINGLE
-- transaction: (1) persist the approval request through the event-sourced
-- Approval Framework engine (save_approval_request), and (2) flip the job
-- opening to pending_approval with its designated approver, and (3) record the
-- activity. recruitment_job_openings has no authenticated grant, so the previous
-- app-orchestrated status update failed 42501.
--
-- Design: the application builds the approval aggregate + domain events with the
-- framework's existing serialization (mapApprovalRequestToPersistence /
-- mapApprovalDomainEventsToPersistence) and passes them here — the engine is
-- reused, never reimplemented. This boundary only orchestrates the two
-- persistence operations atomically and enforces the recruitment invariants
-- (owner/admin/hr actor, tenant isolation, current status = draft, subject
-- binding). Idempotency/double-submit protection comes from the draft guard
-- under a row lock: a second submit sees a non-draft opening and is rejected
-- before any approval request is created. SECURITY DEFINER + hardened
-- search_path; execute granted only to authenticated; no table grants.

create or replace function public.submit_tenant_job_opening_for_approval_v1(
  p_company_id uuid,
  p_job_opening_id uuid,
  p_aggregate jsonb,
  p_events jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_request jsonb := p_aggregate -> 'request';
  v_approver uuid;
  v_row public.recruitment_job_openings%rowtype;
begin
  -- Active owner/admin/hr actor (shared management-mutator gate; actor = auth.uid()).
  v_actor := public.require_people_organization_mutator(p_company_id);

  -- The submitted aggregate must bind to THIS job opening/tenant and be a fresh
  -- pending request (version 1), so a caller cannot smuggle a mismatched or
  -- pre-decided aggregate through the boundary.
  if v_request is null
    or (v_request ->> 'company_id')::uuid <> p_company_id
    or coalesce(v_request ->> 'module', '') <> 'recruitment'
    or coalesce(v_request ->> 'entity_type', '') <> 'job_opening'
    or (v_request ->> 'entity_id')::uuid <> p_job_opening_id
    or coalesce(v_request ->> 'status', '') <> 'pending'
    or coalesce((v_request ->> 'version')::integer, 0) <> 1
  then
    raise exception using errcode = '22023', message = 'JOB_OPENING_APPROVAL_SUBMISSION_INVALID';
  end if;

  v_approver := (p_aggregate -> 'assignments' -> 0 ->> 'principal_id')::uuid;
  if v_approver is null then
    raise exception using errcode = '22023', message = 'JOB_OPENING_APPROVER_REQUIRED';
  end if;

  -- Lock the opening and require draft + tenant ownership + not deleted.
  select * into v_row from public.recruitment_job_openings
    where id = p_job_opening_id and company_id = p_company_id
    for update;
  if not found or v_row.deleted_at is not null then
    raise exception using errcode = '23503', message = 'JOB_OPENING_NOT_FOUND';
  end if;
  if v_row.status <> 'draft' then
    raise exception using errcode = '22023', message = 'JOB_OPENING_NOT_DRAFT';
  end if;

  -- The approver must be a person of the same tenant.
  if not exists (select 1 from public.people pe
    where pe.id = v_approver and pe.company_id = p_company_id)
  then
    raise exception using errcode = '23503', message = 'JOB_OPENING_APPROVER_INVALID';
  end if;

  -- (1) Persist the approval aggregate via the framework engine (same transaction).
  perform public.save_approval_request(p_aggregate, coalesce(p_events, '[]'::jsonb), 0);

  -- (2) Transition the opening to pending_approval with its designated approver.
  update public.recruitment_job_openings
    set status = 'pending_approval', approver_id = v_approver, updated_at = now()
    where id = p_job_opening_id and company_id = p_company_id and status = 'draft'
    returning * into v_row;

  -- (3) Record the submission activity atomically.
  insert into public.activity_events (
    company_id, activity_type, module, title, description, actor_type, actor_id,
    entity_type, entity_id, occurred_at, metadata, idempotency_key
  ) values (
    p_company_id, 'job_opening.submitted_for_approval', 'recruitment',
    'Vaga enviada para aprovação',
    'A vaga "' || v_row.title || '" foi enviada para aprovação.', 'user', v_actor,
    'job_opening', p_job_opening_id, now(),
    jsonb_build_object('job_opening_id', p_job_opening_id, 'approval_request_id', v_request ->> 'id'),
    'recruitment:job-opening:submit:' || p_job_opening_id::text || ':' || (v_request ->> 'idempotency_key')
  );

  return to_jsonb(v_row);
end;
$$;

-- Detail read boundary: the job opening detail page needs the full row (the 0084
-- list boundary only returns a subset). Membership-gated, mirroring the
-- "members can read recruitment job openings" policy; returns the persisted row
-- (including its current status, which is how the UI shows approval state).
create or replace function public.get_tenant_job_opening_v1(
  p_company_id uuid,
  p_job_opening_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.recruitment_job_openings%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if not public.is_company_member(p_company_id) then
    raise exception using errcode = '42501', message = 'TENANT_AUTHORIZATION_DENIED';
  end if;

  select * into v_row from public.recruitment_job_openings
    where id = p_job_opening_id and company_id = p_company_id and deleted_at is null;

  if not found then
    return null;
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.submit_tenant_job_opening_for_approval_v1(uuid, uuid, jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.get_tenant_job_opening_v1(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.submit_tenant_job_opening_for_approval_v1(uuid, uuid, jsonb, jsonb),
  public.get_tenant_job_opening_v1(uuid, uuid)
  to authenticated;

notify pgrst, 'reload schema';
