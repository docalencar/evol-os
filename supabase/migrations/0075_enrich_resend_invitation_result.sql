-- MVP-PR1 Phase 5 Block R1: return the minimum delivery context from the
-- already-authorized resend boundary. Invitation table reads remain closed.

create or replace function public.resend_company_member_invitation_v1(
  p_company_id uuid,
  p_invitation_id uuid,
  p_expected_generation integer,
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
  v_inv public.company_member_invitations%rowtype;
  v_res jsonb;
  v_op uuid;
  v_result jsonb;
begin
  if p_token_digest_hex !~ '^[0-9a-fA-F]{64}$' then
    raise exception using errcode = '22023', message = 'TENANT_INVITE_INVALID';
  end if;

  select * into v_inv
  from public.company_member_invitations
  where id = p_invitation_id
    and company_id = p_company_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'TENANT_INVITE_NOT_FOUND';
  end if;

  perform public.require_tenant_access_administrator(
    p_company_id,
    v_inv.intended_role = 'owner'
  );

  v_res := public.reserve_tenant_access_operation(
    p_company_id,
    'invite_resend',
    p_idempotency_key,
    jsonb_build_object(
      'invitationId', p_invitation_id,
      'expectedGeneration', p_expected_generation,
      'tokenDigest', lower(p_token_digest_hex)
    ),
    p_correlation_id
  );

  if v_res ->> 'status' <> 'acquired' then
    return v_res;
  end if;

  v_op := (v_res ->> 'operationId')::uuid;

  if v_inv.status in ('revoked', 'accepted') then
    raise exception using
      errcode = '23514',
      message = case
        when v_inv.status = 'revoked' then 'TENANT_INVITE_REVOKED'
        else 'TENANT_INVITE_ALREADY_ACCEPTED'
      end;
  end if;

  if v_inv.generation <> p_expected_generation then
    raise exception using errcode = '40001', message = 'TENANT_CONFLICT';
  end if;

  perform 1
  from public.companies
  where id = p_company_id
  for update;

  if exists (
    select 1
    from public.company_member_invitations
    where token_digest = decode(lower(p_token_digest_hex), 'hex')
      and id <> p_invitation_id
  ) then
    return public.fail_tenant_access_operation(
      v_op,
      p_company_id,
      'TENANT_CONFLICT',
      'conflict',
      'invite.resent',
      'invitation',
      p_invitation_id,
      null,
      p_correlation_id
    );
  end if;

  update public.company_member_invitations
  set token_digest = decode(lower(p_token_digest_hex), 'hex'),
    generation = generation + 1,
    status = 'pending',
    expires_at = now() + interval '7 days',
    updated_at = now()
  where id = p_invitation_id
  returning generation, expires_at
  into v_inv.generation, v_inv.expires_at;

  perform public.append_tenant_access_audit(
    v_op,
    p_company_id,
    'invite.resent',
    'invitation',
    p_invitation_id,
    null,
    p_correlation_id,
    jsonb_build_object('generation', v_inv.generation)
  );

  v_result := jsonb_build_object(
    'invitationId', p_invitation_id,
    'generation', v_inv.generation,
    'status', 'pending',
    'destinationEmail', v_inv.target_email_normalized,
    'intendedRole', v_inv.intended_role,
    'expiresAt', v_inv.expires_at
  );

  return public.complete_tenant_access_operation(v_op, v_result);
end;
$$;

revoke all on function public.resend_company_member_invitation_v1(
  uuid,
  uuid,
  integer,
  text,
  text,
  uuid
)
from public, anon, service_role;

grant execute on function public.resend_company_member_invitation_v1(
  uuid,
  uuid,
  integer,
  text,
  text,
  uuid
)
to authenticated;
