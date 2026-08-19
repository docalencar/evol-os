-- MVP Closure: Recruitment Phase 3a — atomic "approve job opening".
--
-- Approving a pending_approval opening must, in a single transaction: persist the
-- approval decision through the event-sourced Approval Framework engine
-- (save_approval_request, with optimistic concurrency), and transition the
-- opening pending_approval -> approved, and record the activity. The previous
-- flow read approval_requests directly (42501) and updated recruitment_job_openings
-- directly (42501) in separate transactions.
--
-- Two additive, membership/role-gated SECURITY DEFINER boundaries:
--   1. get_tenant_job_opening_pending_approval_v1 — returns the pending approval
--      request AGGREGATE (nested stages/assignments/decisions, exactly the
--      ApprovalRequestPersistenceRecord shape) so the app rehydrates it with the
--      framework's mapApprovalRequestToDomain and runs the decision rule. The app
--      builds the decided aggregate + domain events with the framework
--      serializers — the engine is reused, never reimplemented in SQL.
--   2. approve_tenant_job_opening_v1 — persists that decided aggregate via
--      save_approval_request (which enforces expected_version) AND transitions the
--      opening + records activity, all atomically.
--
-- No table grants; no RLS/policy changes; actor from auth.uid(); tenant scoped;
-- hardened search_path.

-- Aggregate read boundary (membership-gated; company-scoped).
create or replace function public.get_tenant_job_opening_pending_approval_v1(
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
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if not public.is_company_member(p_company_id) then
    raise exception using errcode = '42501', message = 'TENANT_AUTHORIZATION_DENIED';
  end if;

  select
    to_jsonb(r)
    || jsonb_build_object(
      'approval_stages',
      coalesce((
        select jsonb_agg(
          to_jsonb(s) || jsonb_build_object(
            'approval_assignments',
            coalesce((
              select jsonb_agg(to_jsonb(a) order by a.assigned_at, a.id)
              from public.approval_assignments a
              where a.approval_request_id = r.id
                and a.stage_id = s.id
                and a.company_id = p_company_id
            ), '[]'::jsonb)
          )
          order by s.sequence
        )
        from public.approval_stages s
        where s.approval_request_id = r.id and s.company_id = p_company_id
      ), '[]'::jsonb),
      'approval_decisions',
      coalesce((
        select jsonb_agg(to_jsonb(d) order by d.decided_at, d.id)
        from public.approval_decisions d
        where d.approval_request_id = r.id and d.company_id = p_company_id
      ), '[]'::jsonb)
    )
  into v_result
  from public.approval_requests r
  where r.company_id = p_company_id
    and r.module = 'recruitment'
    and r.entity_type = 'job_opening'
    and r.entity_id = p_job_opening_id::text
    and r.status = 'pending'
  order by r.requested_at desc, r.id
  limit 1;

  return v_result;
end;
$$;

-- Atomic approve boundary (owner/admin/hr gate).
create or replace function public.approve_tenant_job_opening_v1(
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
  v_approver uuid;
  v_row public.recruitment_job_openings%rowtype;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);

  -- The decided aggregate must bind to this opening/tenant and be the recruitment
  -- request now in the 'approved' state.
  if v_request is null
    or (v_request ->> 'company_id')::uuid <> p_company_id
    or coalesce(v_request ->> 'module', '') <> 'recruitment'
    or coalesce(v_request ->> 'entity_type', '') <> 'job_opening'
    or (v_request ->> 'entity_id')::uuid <> p_job_opening_id
    or coalesce(v_request ->> 'status', '') <> 'approved'
  then
    raise exception using errcode = '22023', message = 'JOB_OPENING_APPROVAL_DECISION_INVALID';
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

  v_approver := public.current_person_id(p_company_id);
  if v_approver is null then
    raise exception using errcode = '22023', message = 'JOB_OPENING_APPROVER_REQUIRED';
  end if;

  -- The persisting actor must be the author of the decision (identity binding).
  -- The assignment-eligibility rule (was this person the assigned approver) is
  -- enforced by the domain aggregate.decide in the application, not here.
  if not exists (
    select 1
    from jsonb_array_elements(coalesce(p_aggregate -> 'decisions', '[]'::jsonb)) elem
    where elem ->> 'actor_person_id' = v_approver::text
  ) then
    raise exception using errcode = '42501', message = 'JOB_OPENING_APPROVAL_ACTOR_MISMATCH';
  end if;

  -- (1) Persist the decision via the framework engine (enforces expected_version;
  -- a stale version raises 40001 APPROVAL_VERSION_CONFLICT and rolls the tx back).
  perform public.save_approval_request(p_aggregate, coalesce(p_events, '[]'::jsonb), p_expected_version);

  -- (2) Transition the opening to approved.
  update public.recruitment_job_openings
    set status = 'approved', approver_id = v_approver, approved_at = now(), updated_at = now()
    where id = p_job_opening_id and company_id = p_company_id and status = 'pending_approval'
    returning * into v_row;

  -- (3) Record the approval activity (idempotency key ties it to this request version).
  insert into public.activity_events (
    company_id, activity_type, module, title, description, actor_type, actor_id,
    entity_type, entity_id, occurred_at, metadata, idempotency_key
  ) values (
    p_company_id, 'job_opening.approved', 'recruitment', 'Vaga aprovada',
    'A vaga "' || v_row.title || '" foi aprovada.', 'user', v_actor,
    'job_opening', p_job_opening_id, now(),
    jsonb_build_object('job_opening_id', p_job_opening_id, 'approval_request_id', v_request ->> 'id'),
    'recruitment:job-opening:approve:' || p_job_opening_id::text || ':' || (v_request ->> 'version')
  );

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.get_tenant_job_opening_pending_approval_v1(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.approve_tenant_job_opening_v1(uuid, uuid, jsonb, jsonb, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.get_tenant_job_opening_pending_approval_v1(uuid, uuid),
  public.approve_tenant_job_opening_v1(uuid, uuid, jsonb, jsonb, integer)
  to authenticated;

notify pgrst, 'reload schema';
