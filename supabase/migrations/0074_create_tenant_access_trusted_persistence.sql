-- MVP-PR1 Phase 3, block 1: authenticated trusted persistence.
-- Human authority always comes from auth.uid(); service_role is not an actor.

create or replace function public.tenant_access_fingerprint(p_intent jsonb)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select encode(extensions.digest(convert_to(p_intent::text, 'utf8'), 'sha256'), 'hex');
$$;

create or replace function public.reserve_tenant_access_operation(
  p_company_id uuid,
  p_operation text,
  p_idempotency_key text,
  p_intent jsonb,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_fingerprint text := public.tenant_access_fingerprint(p_intent);
  v_operation public.tenant_access_operations%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if nullif(btrim(p_idempotency_key), '') is null or p_correlation_id is null then
    raise exception using errcode = '22023', message = 'TENANT_OPERATION_INVALID';
  end if;

  insert into public.tenant_access_operations (
    company_id, actor_user_id, operation, idempotency_key,
    intent_fingerprint, correlation_id
  ) values (
    p_company_id, v_actor, p_operation, btrim(p_idempotency_key),
    v_fingerprint, p_correlation_id
  )
  on conflict (company_id, actor_user_id, operation, idempotency_key)
  do nothing;

  select * into v_operation
  from public.tenant_access_operations
  where company_id = p_company_id
    and actor_user_id = v_actor
    and operation = p_operation
    and idempotency_key = btrim(p_idempotency_key)
  for update;

  if v_operation.intent_fingerprint <> v_fingerprint then
    return jsonb_build_object(
      'status', 'conflict',
      'operationId', v_operation.id,
      'code', 'TENANT_IDEMPOTENCY_CONFLICT'
    );
  end if;
  if v_operation.status = 'succeeded' then
    return jsonb_build_object(
      'status', 'idempotent_retry',
      'operationId', v_operation.id,
      'result', v_operation.result
    );
  end if;
  if v_operation.status = 'failed' then
    return jsonb_build_object(
      'status', 'known_failure',
      'operationId', v_operation.id,
      'code', v_operation.failure_code,
      'result', v_operation.result
    );
  end if;
  return jsonb_build_object('status', 'acquired', 'operationId', v_operation.id);
end;
$$;

create or replace function public.complete_tenant_access_operation(
  p_operation_id uuid,
  p_result jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.tenant_access_operations
  set status = 'succeeded', result = p_result, completed_at = now(), updated_at = now()
  where id = p_operation_id and actor_user_id = auth.uid() and status = 'reserved';
  if not found then
    raise exception using errcode = '40001', message = 'TENANT_CONFLICT';
  end if;
  return jsonb_build_object(
    'status', 'succeeded', 'operationId', p_operation_id, 'result', p_result
  );
end;
$$;

create or replace function public.append_tenant_access_audit(
  p_operation_id uuid,
  p_company_id uuid,
  p_event_type text,
  p_target_type text,
  p_target_id uuid,
  p_target_user_id uuid,
  p_correlation_id uuid,
  p_metadata jsonb default '{}'::jsonb,
  p_outcome text default 'succeeded',
  p_reason_code text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  insert into public.tenant_access_audit_events (
    company_id, operation_id, event_type, actor_user_id,
    executor_type, executor_id, target_type, target_id,
    target_user_id, correlation_id, outcome, reason_code, metadata
  ) values (
    p_company_id, p_operation_id, p_event_type, v_actor,
    'authenticated', 'authenticated:' || v_actor::text,
    p_target_type, p_target_id, p_target_user_id,
    p_correlation_id, p_outcome, p_reason_code, coalesce(p_metadata, '{}'::jsonb)
  );
end;
$$;

create or replace function public.fail_tenant_access_operation(
  p_operation_id uuid,
  p_company_id uuid,
  p_code text,
  p_result_status text,
  p_event_type text,
  p_target_type text,
  p_target_id uuid,
  p_target_user_id uuid,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_result jsonb;
begin
  v_result := jsonb_build_object('code', p_code);
  update public.tenant_access_operations
  set status='failed', failure_code=p_code, result=v_result,
    completed_at=now(), updated_at=now()
  where id=p_operation_id and actor_user_id=auth.uid() and status='reserved';
  if not found then
    raise exception using errcode='40001',message='TENANT_CONFLICT';
  end if;
  perform public.append_tenant_access_audit(
    p_operation_id,p_company_id,p_event_type,p_target_type,p_target_id,
    p_target_user_id,p_correlation_id,'{}'::jsonb,
    case when p_result_status='denied' then 'denied'
      when p_result_status='conflict' then 'conflict' else 'failed' end,
    p_code
  );
  return jsonb_build_object('status',p_result_status,'operationId',p_operation_id,
    'code',p_code,'result',v_result);
end;
$$;

create or replace function public.require_tenant_access_administrator(
  p_company_id uuid,
  p_owner_authority_required boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if not exists (
    select 1 from public.company_members
    where company_id = p_company_id and user_id = v_actor and status = 'active'
      and role = any(
        case when p_owner_authority_required
          then array['owner']::text[] else array['owner', 'admin']::text[] end
      )
  ) then
    raise exception using errcode = '42501', message = 'TENANT_AUTHORIZATION_DENIED';
  end if;
  return v_actor;
end;
$$;

create or replace function public.issue_company_member_invitation_v1(
  p_company_id uuid,
  p_person_id uuid,
  p_target_email text,
  p_intended_role text,
  p_token_digest_hex text,
  p_idempotency_key text,
  p_correlation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_email text := lower(btrim(p_target_email));
  v_person public.people%rowtype;
  v_reservation jsonb;
  v_operation_id uuid;
  v_invitation_id uuid;
  v_result jsonb;
begin
  if p_intended_role not in ('owner', 'admin', 'hr', 'manager', 'employee')
    or p_token_digest_hex !~ '^[0-9a-fA-F]{64}$'
  then
    raise exception using errcode = '22023', message = 'TENANT_INVITE_INVALID';
  end if;
  v_actor := public.require_tenant_access_administrator(
    p_company_id, p_intended_role = 'owner'
  );
  select * into v_person from public.people
  where id = p_person_id and company_id = p_company_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'TENANT_INVITE_NOT_FOUND';
  end if;
  if v_person.status <> 'active' or v_person.email is null
    or lower(btrim(v_person.email)) <> v_email
  then
    raise exception using errcode = '23514', message = 'TENANT_INVITE_IDENTITY_INVALID';
  end if;
  if v_person.user_id is not null then
    raise exception using errcode = '23505', message = 'TENANT_PERSON_ALREADY_LINKED';
  end if;

  v_reservation := public.reserve_tenant_access_operation(
    p_company_id, 'invite_issue', p_idempotency_key,
    jsonb_build_object('companyId', p_company_id, 'personId', p_person_id,
      'email', v_email, 'role', p_intended_role,
      'tokenDigest', lower(p_token_digest_hex)),
    p_correlation_id
  );
  if v_reservation ->> 'status' <> 'acquired' then return v_reservation; end if;
  v_operation_id := (v_reservation ->> 'operationId')::uuid;

  perform 1 from public.companies where id=p_company_id for update;
  select id into v_invitation_id from public.company_member_invitations
  where company_id=p_company_id and status='pending'
    and (person_id=p_person_id or target_email_normalized=v_email)
  limit 1;
  if found then
    return public.fail_tenant_access_operation(v_operation_id,p_company_id,
      'TENANT_CONFLICT','conflict','invite.created','invitation',
      v_invitation_id,null,p_correlation_id);
  end if;
  select id into v_invitation_id from public.company_member_invitations
  where token_digest=decode(lower(p_token_digest_hex),'hex') limit 1;
  if found then
    return public.fail_tenant_access_operation(v_operation_id,p_company_id,
      'TENANT_CONFLICT','conflict','invite.created','invitation',
      v_operation_id,null,p_correlation_id);
  end if;

  insert into public.company_member_invitations (
    company_id, person_id, target_email_normalized, intended_role,
    token_digest, expires_at, created_by_actor_user_id,
    created_operation_id, idempotency_key, intent_fingerprint, correlation_id
  ) values (
    p_company_id, p_person_id, v_email, p_intended_role,
    decode(lower(p_token_digest_hex), 'hex'), now() + interval '7 days', v_actor,
    v_operation_id, btrim(p_idempotency_key),
    public.tenant_access_fingerprint(jsonb_build_object(
      'companyId', p_company_id, 'personId', p_person_id,
      'email', v_email, 'role', p_intended_role
    )), p_correlation_id
  ) returning id into v_invitation_id;

  perform public.append_tenant_access_audit(
    v_operation_id, p_company_id, 'invite.created', 'invitation',
    v_invitation_id, null, p_correlation_id,
    jsonb_build_object('personId', p_person_id, 'intendedRole', p_intended_role)
  );
  v_result := jsonb_build_object(
    'invitationId', v_invitation_id, 'generation', 1,
    'status', 'pending', 'expiresAt', now() + interval '7 days'
  );
  return public.complete_tenant_access_operation(v_operation_id, v_result);
end;
$$;

create or replace function public.resend_company_member_invitation_v1(
  p_company_id uuid,
  p_invitation_id uuid,
  p_expected_generation integer,
  p_token_digest_hex text,
  p_idempotency_key text,
  p_correlation_id uuid
)
returns jsonb
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_inv public.company_member_invitations%rowtype; v_res jsonb;
  v_op uuid; v_result jsonb;
begin
  if p_token_digest_hex !~ '^[0-9a-fA-F]{64}$' then
    raise exception using errcode='22023', message='TENANT_INVITE_INVALID';
  end if;
  select * into v_inv from public.company_member_invitations
  where id=p_invitation_id and company_id=p_company_id for update;
  if not found then raise exception using errcode='P0002', message='TENANT_INVITE_NOT_FOUND'; end if;
  perform public.require_tenant_access_administrator(p_company_id, v_inv.intended_role='owner');
  if v_inv.status in ('revoked','accepted') then
    raise exception using errcode='23514', message=case when v_inv.status='revoked'
      then 'TENANT_INVITE_REVOKED' else 'TENANT_INVITE_ALREADY_ACCEPTED' end;
  end if;
  if v_inv.generation<>p_expected_generation then
    raise exception using errcode='40001',message='TENANT_CONFLICT';
  end if;
  v_res := public.reserve_tenant_access_operation(p_company_id,'invite_resend',p_idempotency_key,
    jsonb_build_object('invitationId',p_invitation_id,'expectedGeneration',p_expected_generation,
      'tokenDigest',lower(p_token_digest_hex)),p_correlation_id);
  if v_res->>'status'<>'acquired' then return v_res; end if;
  v_op := (v_res->>'operationId')::uuid;
  perform 1 from public.companies where id=p_company_id for update;
  if exists(select 1 from public.company_member_invitations
    where token_digest=decode(lower(p_token_digest_hex),'hex') and id<>p_invitation_id) then
    return public.fail_tenant_access_operation(v_op,p_company_id,'TENANT_CONFLICT',
      'conflict','invite.resent','invitation',p_invitation_id,null,p_correlation_id);
  end if;
  update public.company_member_invitations set token_digest=decode(lower(p_token_digest_hex),'hex'),
    generation=generation+1,status='pending',expires_at=now()+interval '7 days',updated_at=now()
  where id=p_invitation_id returning generation into v_inv.generation;
  perform public.append_tenant_access_audit(v_op,p_company_id,'invite.resent','invitation',
    p_invitation_id,null,p_correlation_id,jsonb_build_object('generation',v_inv.generation));
  v_result:=jsonb_build_object('invitationId',p_invitation_id,'generation',v_inv.generation,'status','pending');
  return public.complete_tenant_access_operation(v_op,v_result);
end; $$;

create or replace function public.revoke_company_member_invitation_v1(
  p_company_id uuid, p_invitation_id uuid, p_expected_generation integer, p_idempotency_key text,
  p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_inv public.company_member_invitations%rowtype; v_res jsonb; v_op uuid; v_result jsonb;
begin
  select * into v_inv from public.company_member_invitations
    where id=p_invitation_id and company_id=p_company_id for update;
  if not found then raise exception using errcode='P0002',message='TENANT_INVITE_NOT_FOUND'; end if;
  perform public.require_tenant_access_administrator(p_company_id,v_inv.intended_role='owner');
  if v_inv.generation<>p_expected_generation then
    raise exception using errcode='40001',message='TENANT_CONFLICT';
  end if;
  v_res:=public.reserve_tenant_access_operation(p_company_id,'invite_revoke',p_idempotency_key,
    jsonb_build_object('invitationId',p_invitation_id,'expectedGeneration',p_expected_generation),p_correlation_id);
  if v_res->>'status'<>'acquired' then return v_res; end if;
  v_op:=(v_res->>'operationId')::uuid;
  if v_inv.status='accepted' then raise exception using errcode='23514',message='TENANT_INVITE_ALREADY_ACCEPTED'; end if;
  if v_inv.status<>'revoked' then
    update public.company_member_invitations set status='revoked',revoked_at=now(),
      revoked_by_actor_user_id=auth.uid(),updated_at=now() where id=p_invitation_id;
    perform public.append_tenant_access_audit(v_op,p_company_id,'invite.revoked','invitation',
      p_invitation_id,null,p_correlation_id,'{}'::jsonb);
  end if;
  v_result:=jsonb_build_object('invitationId',p_invitation_id,'status','revoked');
  return public.complete_tenant_access_operation(v_op,v_result);
end; $$;

-- Preserve every Phase 2 invariant while recognizing a freshly accepted owner
-- invitation as a grant that was previously authorized by a still-active owner.
create or replace function public.enforce_company_member_owner_invariants()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_company_id uuid; v_actor_user_id uuid:=auth.uid(); v_owner_count bigint;
  v_member_count bigint; v_actor_is_active_owner boolean; v_touches_owner boolean:=false;
  v_removes_active_owner boolean:=false; v_has_current_owner_grant boolean:=false;
begin
  v_company_id:=case when tg_op='DELETE' then old.company_id else new.company_id end;
  if tg_op='INSERT' then v_touches_owner:=new.role='owner';
  elsif tg_op='UPDATE' then v_touches_owner:=old.role='owner' or new.role='owner';
    v_removes_active_owner:=old.role='owner' and old.status='active'
      and (new.role<>'owner' or new.status<>'active');
  else v_touches_owner:=old.role='owner';
    v_removes_active_owner:=old.role='owner' and old.status='active'; end if;
  if not v_touches_owner then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  perform 1 from public.companies where id=v_company_id for update;
  if not found then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  select count(*) filter(where role='owner' and status='active'),count(*)
    into v_owner_count,v_member_count from public.company_members where company_id=v_company_id;
  if tg_op='INSERT' and v_member_count=0 and (v_actor_user_id=new.user_id or
    (session_user in ('postgres','supabase_admin') and
      coalesce(current_setting('role',true),'none') in ('none','postgres'))) then return new; end if;
  select exists(select 1 from public.company_members where company_id=v_company_id
    and user_id=v_actor_user_id and role='owner' and status='active') into v_actor_is_active_owner;
  if tg_op in ('INSERT','UPDATE') and new.role='owner' and new.status='active'
    and new.user_id=v_actor_user_id then
    select exists(
      select 1 from public.company_member_invitations i
      join public.company_members grantor on grantor.company_id=i.company_id
        and grantor.user_id=i.created_by_actor_user_id
        and grantor.role='owner' and grantor.status='active'
      where i.company_id=v_company_id
        and i.intended_role='owner' and i.status='accepted'
        and i.accepted_by_user_id=v_actor_user_id
        and i.accepted_at=transaction_timestamp()
    ) into v_has_current_owner_grant;
  end if;
  if not coalesce(v_actor_is_active_owner,false) and not v_has_current_owner_grant then
    raise exception using errcode='42501',message='OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER';
  end if;
  if v_removes_active_owner and v_owner_count<=1 then
    raise exception using errcode='23514',message='LAST_ACTIVE_OWNER_REQUIRED'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;

create or replace function public.accept_company_member_invitation_v1(
  p_token_digest_hex text, p_idempotency_key text, p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid:=auth.uid(); v_inv public.company_member_invitations%rowtype;
  v_person public.people%rowtype; v_member public.company_members%rowtype;
  v_email text; v_res jsonb; v_op uuid; v_result jsonb; v_created boolean:=false;
begin
  if v_actor is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if p_token_digest_hex !~ '^[0-9a-fA-F]{64}$' then raise exception using errcode='P0002',message='TENANT_INVITE_NOT_FOUND'; end if;
  select * into v_inv from public.company_member_invitations
    where token_digest=decode(lower(p_token_digest_hex),'hex') for update;
  if not found then raise exception using errcode='P0002',message='TENANT_INVITE_NOT_FOUND'; end if;
  v_res:=public.reserve_tenant_access_operation(v_inv.company_id,'invite_accept',p_idempotency_key,
    jsonb_build_object('invitationId',v_inv.id,'generation',v_inv.generation,'acceptor',v_actor),p_correlation_id);
  if v_res->>'status'<>'acquired' then return v_res; end if;
  v_op:=(v_res->>'operationId')::uuid;
  if v_inv.status='revoked' then
    return public.fail_tenant_access_operation(v_op,v_inv.company_id,'TENANT_INVITE_REVOKED',
      'known_failure','invite.accepted','invitation',v_inv.id,v_actor,p_correlation_id);
  end if;
  if v_inv.status='accepted' then
    if v_inv.accepted_by_user_id=v_actor then
      v_result:=jsonb_build_object('invitationId',v_inv.id,'membershipId',
        (select id from public.company_members where company_id=v_inv.company_id and user_id=v_actor),'status','accepted');
      return public.complete_tenant_access_operation(v_op,v_result);
    end if;
    return public.fail_tenant_access_operation(v_op,v_inv.company_id,'TENANT_INVITE_ALREADY_ACCEPTED',
      'conflict','invite.accepted','invitation',v_inv.id,v_actor,p_correlation_id);
  end if;
  if v_inv.expires_at<=now() then
    return public.fail_tenant_access_operation(v_op,v_inv.company_id,'TENANT_INVITE_EXPIRED',
      'known_failure','invite.accepted','invitation',v_inv.id,v_actor,p_correlation_id);
  end if;
  if v_inv.intended_role='owner' then
    perform 1 from public.companies where id=v_inv.company_id for update;
  end if;
  select lower(btrim(email)) into v_email from auth.users
    where id=v_actor and email_confirmed_at is not null;
  if v_email is null or v_email<>v_inv.target_email_normalized then
    return public.fail_tenant_access_operation(v_op,v_inv.company_id,
      'TENANT_INVITE_NOT_FOUND','denied','invite.accepted','invitation',
      v_inv.id,v_actor,p_correlation_id);
  end if;
  select * into v_person from public.people where id=v_inv.person_id
    and company_id=v_inv.company_id for update;
  if not found or v_person.status<>'active' then
    return public.fail_tenant_access_operation(v_op,v_inv.company_id,
      'TENANT_INVITE_NOT_FOUND','known_failure','invite.accepted','invitation',
      v_inv.id,v_actor,p_correlation_id);
  end if;
  if v_person.user_id is not null and v_person.user_id<>v_actor then
    return public.fail_tenant_access_operation(v_op,v_inv.company_id,
      'TENANT_PERSON_ALREADY_LINKED','conflict','invite.accepted','invitation',
      v_inv.id,v_actor,p_correlation_id);
  end if;
  if v_inv.intended_role='owner' then
    perform 1 from public.company_members
      where company_id=v_inv.company_id and user_id=v_inv.created_by_actor_user_id
        and role='owner' and status='active' for update;
    if not found then
      return public.fail_tenant_access_operation(v_op,v_inv.company_id,
        'TENANT_OWNER_AUTHORIZATION_INVALID','denied','invite.accepted',
        'invitation',v_inv.id,v_actor,p_correlation_id);
    end if;
  end if;
  update public.company_member_invitations set status='accepted',accepted_at=transaction_timestamp(),
    accepted_by_user_id=v_actor,updated_at=now() where id=v_inv.id;
  select * into v_member from public.company_members where company_id=v_inv.company_id
    and user_id=v_actor for update;
  if found and v_member.status='active' then
    return public.fail_tenant_access_operation(v_op,v_inv.company_id,
      'TENANT_MEMBERSHIP_ALREADY_EXISTS','conflict','invite.accepted','invitation',
      v_inv.id,v_actor,p_correlation_id);
  end if;
  if not found then
    insert into public.company_members(company_id,user_id,role,status)
      values(v_inv.company_id,v_actor,v_inv.intended_role,'active') returning * into v_member;
    v_created:=true;
  else
    update public.company_members set role=v_inv.intended_role,status='active'
      where id=v_member.id returning * into v_member;
  end if;
  update public.people set user_id=v_actor,updated_at=now() where id=v_person.id;
  perform public.append_tenant_access_audit(v_op,v_inv.company_id,'invite.accepted','invitation',
    v_inv.id,v_actor,p_correlation_id,jsonb_build_object('grantorUserId',v_inv.created_by_actor_user_id));
  if v_created then perform public.append_tenant_access_audit(v_op,v_inv.company_id,'membership.created','membership',
    v_member.id,v_actor,p_correlation_id,jsonb_build_object('authorizationSourceUserId',v_inv.created_by_actor_user_id,'invitationId',v_inv.id)); end if;
  perform public.append_tenant_access_audit(v_op,v_inv.company_id,'person.linked','person',
    v_person.id,v_actor,p_correlation_id,jsonb_build_object('invitationId',v_inv.id));
  v_result:=jsonb_build_object('invitationId',v_inv.id,'membershipId',v_member.id,'personId',v_person.id,'status','accepted');
  return public.complete_tenant_access_operation(v_op,v_result);
end; $$;

create or replace function public.change_company_member_role_v1(
  p_company_id uuid,p_membership_id uuid,p_expected_role text,p_expected_status text,
  p_new_role text,p_idempotency_key text,p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_member public.company_members%rowtype; v_res jsonb; v_op uuid; v_result jsonb;
begin
  if p_new_role not in ('owner','admin','hr','manager','employee') then raise exception using errcode='22023',message='TENANT_ROLE_INVALID'; end if;
  perform 1 from public.companies where id=p_company_id for update;
  select * into v_member from public.company_members where id=p_membership_id and company_id=p_company_id for update;
  if not found then raise exception using errcode='P0002',message='TENANT_MEMBERSHIP_NOT_FOUND'; end if;
  perform public.require_tenant_access_administrator(p_company_id,p_new_role='owner' or v_member.role='owner');
  if v_member.role<>p_expected_role or v_member.status<>p_expected_status then
    raise exception using errcode='40001',message='TENANT_CONFLICT';
  end if;
  v_res:=public.reserve_tenant_access_operation(p_company_id,'membership_role_change',p_idempotency_key,
    jsonb_build_object('membershipId',p_membership_id,'expectedRole',p_expected_role,
      'expectedStatus',p_expected_status,'newRole',p_new_role),p_correlation_id);
  if v_res->>'status'<>'acquired' then return v_res; end if; v_op:=(v_res->>'operationId')::uuid;
  update public.company_members set role=p_new_role where id=p_membership_id;
  perform public.append_tenant_access_audit(v_op,p_company_id,'membership.role_changed','membership',p_membership_id,
    v_member.user_id,p_correlation_id,jsonb_build_object('previousRole',v_member.role,'newRole',p_new_role));
  v_result:=jsonb_build_object('membershipId',p_membership_id,'role',p_new_role);
  return public.complete_tenant_access_operation(v_op,v_result);
end; $$;

create or replace function public.deactivate_company_membership_v1(
  p_company_id uuid,p_membership_id uuid,p_expected_role text,p_expected_status text,
  p_idempotency_key text,p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_member public.company_members%rowtype; v_person_id uuid; v_res jsonb; v_op uuid; v_result jsonb;
begin
  perform 1 from public.companies where id=p_company_id for update;
  select * into v_member from public.company_members where id=p_membership_id and company_id=p_company_id for update;
  if not found then raise exception using errcode='P0002',message='TENANT_MEMBERSHIP_NOT_FOUND'; end if;
  perform public.require_tenant_access_administrator(p_company_id,v_member.role='owner');
  if v_member.role<>p_expected_role or v_member.status<>p_expected_status then
    raise exception using errcode='40001',message='TENANT_CONFLICT';
  end if;
  v_res:=public.reserve_tenant_access_operation(p_company_id,'membership_deactivate',p_idempotency_key,
    jsonb_build_object('membershipId',p_membership_id,'expectedRole',p_expected_role,
      'expectedStatus',p_expected_status),p_correlation_id);
  if v_res->>'status'<>'acquired' then return v_res; end if; v_op:=(v_res->>'operationId')::uuid;
  select id into v_person_id from public.people where company_id=p_company_id and user_id=v_member.user_id for update;
  update public.company_members set status='inactive' where id=p_membership_id;
  if v_person_id is not null then update public.people set user_id=null,updated_at=now() where id=v_person_id; end if;
  perform public.append_tenant_access_audit(v_op,p_company_id,'membership.deactivated','membership',p_membership_id,
    v_member.user_id,p_correlation_id,'{}'::jsonb);
  if v_person_id is not null then perform public.append_tenant_access_audit(v_op,p_company_id,'person.unlinked','person',v_person_id,
    v_member.user_id,p_correlation_id,jsonb_build_object('membershipId',p_membership_id)); end if;
  v_result:=jsonb_build_object('membershipId',p_membership_id,'personId',v_person_id,'status','inactive');
  return public.complete_tenant_access_operation(v_op,v_result);
end; $$;

create or replace function public.transfer_company_ownership_v1(
  p_company_id uuid,p_target_membership_id uuid,p_expected_target_role text,
  p_expected_actor_role text,p_demote_actor boolean,
  p_idempotency_key text,p_correlation_id uuid
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_actor uuid; v_target public.company_members%rowtype; v_actor_member public.company_members%rowtype;
  v_res jsonb; v_op uuid; v_result jsonb;
begin
  v_actor:=public.require_tenant_access_administrator(p_company_id,true);
  perform 1 from public.companies where id=p_company_id for update;
  select * into v_target from public.company_members where id=p_target_membership_id
    and company_id=p_company_id and status='active' for update;
  if not found then raise exception using errcode='P0002',message='TENANT_MEMBERSHIP_NOT_FOUND'; end if;
  select * into v_actor_member from public.company_members where company_id=p_company_id and user_id=v_actor for update;
  if v_target.user_id=v_actor then raise exception using errcode='22023',message='TENANT_CONFLICT'; end if;
  if v_target.role<>p_expected_target_role or v_actor_member.role<>p_expected_actor_role then
    raise exception using errcode='40001',message='TENANT_CONFLICT';
  end if;
  v_res:=public.reserve_tenant_access_operation(p_company_id,'ownership_transfer',p_idempotency_key,
    jsonb_build_object('targetMembershipId',p_target_membership_id,
      'expectedTargetRole',p_expected_target_role,'expectedActorRole',p_expected_actor_role,
      'demoteActor',p_demote_actor),p_correlation_id);
  if v_res->>'status'<>'acquired' then return v_res; end if; v_op:=(v_res->>'operationId')::uuid;
  update public.company_members set role='owner' where id=p_target_membership_id;
  perform public.append_tenant_access_audit(v_op,p_company_id,'membership.role_changed','membership',p_target_membership_id,
    v_target.user_id,p_correlation_id,jsonb_build_object('previousRole',v_target.role,'newRole','owner','ownershipTransfer',true));
  if p_demote_actor then
    update public.company_members set role='admin' where id=v_actor_member.id;
    perform public.append_tenant_access_audit(v_op,p_company_id,'membership.role_changed','membership',v_actor_member.id,
      v_actor,p_correlation_id,jsonb_build_object('previousRole','owner','newRole','admin','ownershipTransfer',true));
  end if;
  v_result:=jsonb_build_object('targetMembershipId',p_target_membership_id,'targetRole','owner','actorDemoted',p_demote_actor);
  return public.complete_tenant_access_operation(v_op,v_result);
end; $$;

revoke all on function public.tenant_access_fingerprint(jsonb),
  public.reserve_tenant_access_operation(uuid,text,text,jsonb,uuid),
  public.complete_tenant_access_operation(uuid,jsonb),
  public.append_tenant_access_audit(uuid,uuid,text,text,uuid,uuid,uuid,jsonb,text,text),
  public.fail_tenant_access_operation(uuid,uuid,text,text,text,text,uuid,uuid,uuid),
  public.require_tenant_access_administrator(uuid,boolean)
from public, anon, authenticated, service_role;

revoke all on function public.issue_company_member_invitation_v1(uuid,uuid,text,text,text,text,uuid),
  public.resend_company_member_invitation_v1(uuid,uuid,integer,text,text,uuid),
  public.revoke_company_member_invitation_v1(uuid,uuid,integer,text,uuid),
  public.accept_company_member_invitation_v1(text,text,uuid),
  public.change_company_member_role_v1(uuid,uuid,text,text,text,text,uuid),
  public.deactivate_company_membership_v1(uuid,uuid,text,text,text,uuid),
  public.transfer_company_ownership_v1(uuid,uuid,text,text,boolean,text,uuid)
from public, anon, service_role;

grant execute on function public.issue_company_member_invitation_v1(uuid,uuid,text,text,text,text,uuid),
  public.resend_company_member_invitation_v1(uuid,uuid,integer,text,text,uuid),
  public.revoke_company_member_invitation_v1(uuid,uuid,integer,text,uuid),
  public.accept_company_member_invitation_v1(text,text,uuid),
  public.change_company_member_role_v1(uuid,uuid,text,text,text,text,uuid),
  public.deactivate_company_membership_v1(uuid,uuid,text,text,text,uuid),
  public.transfer_company_ownership_v1(uuid,uuid,text,text,boolean,text,uuid)
to authenticated;
