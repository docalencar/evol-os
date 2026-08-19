-- MVP Closure: Recruitment Phase 3b — atomic "open job opening".
--
-- Opening an approved opening (approved -> open) is a recruitment status decision
-- that does NOT involve the Approval Framework: the decision was already recorded
-- at approve time. The previous flow updated recruitment_job_openings directly
-- (42501) and wrote the activity directly (42501) in separate steps.
--
-- One additive, role-gated SECURITY DEFINER boundary that, in a single
-- transaction: authorizes the actor (owner/admin/hr), requires the opening to be
-- approved + tenant-owned + not deleted, transitions it to open, and records the
-- 'job_opening.opened' activity. No table grants; no RLS/policy changes; actor
-- from auth.uid(); tenant scoped; hardened search_path.

create or replace function public.open_tenant_job_opening_v1(
  p_company_id uuid,
  p_job_opening_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_row public.recruitment_job_openings%rowtype;
begin
  v_actor := public.require_people_organization_mutator(p_company_id);

  -- Lock the opening and require approved + tenant ownership + not deleted.
  select * into v_row from public.recruitment_job_openings
    where id = p_job_opening_id and company_id = p_company_id
    for update;
  if not found or v_row.deleted_at is not null then
    raise exception using errcode = '23503', message = 'JOB_OPENING_NOT_FOUND';
  end if;
  if v_row.status <> 'approved' then
    raise exception using errcode = '22023', message = 'JOB_OPENING_NOT_APPROVED';
  end if;

  -- (1) Transition the opening to open. approver_id/approved_at (set at approve
  -- time) are preserved.
  update public.recruitment_job_openings
    set status = 'open', updated_at = now()
    where id = p_job_opening_id and company_id = p_company_id and status = 'approved'
    returning * into v_row;

  -- (2) Record the open activity (idempotency key ties it to this opening).
  insert into public.activity_events (
    company_id, activity_type, module, title, description, actor_type, actor_id,
    entity_type, entity_id, occurred_at, metadata, idempotency_key
  ) values (
    p_company_id, 'job_opening.opened', 'recruitment', 'Vaga aberta',
    'A vaga "' || v_row.title || '" foi aberta.', 'user', v_actor,
    'job_opening', p_job_opening_id, now(),
    jsonb_build_object('job_opening_id', p_job_opening_id),
    'recruitment:job-opening:open:' || p_job_opening_id::text
  );

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.open_tenant_job_opening_v1(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.open_tenant_job_opening_v1(uuid, uuid)
  to authenticated;

notify pgrst, 'reload schema';
