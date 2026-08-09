import assert from "node:assert/strict"
import test from "node:test"

import type { TenantAccessRpcClient } from "./supabase-tenant-access-trusted-persistence"
import { createSupabaseTenantAccessTrustedPersistence } from "./supabase-tenant-access-trusted-persistence"

const context = { idempotencyKey: "idem-1", correlationId: "correlation-1" }

test("maps success and preserves issue invitation identity without actor injection", async () => {
  const database = new RpcClientMock([
    success({ invitationId: "invitation-1", status: "pending", generation: 1 }),
  ])
  const persistence = createSupabaseTenantAccessTrustedPersistence(database)

  assert.deepEqual(
    await persistence.issueInvitation({
      ...context,
      companyId: "company-1",
      personId: "person-1",
      targetEmail: "owner@example.com",
      intendedRole: "owner",
      tokenDigestHex: "digest-1",
    }),
    {
      status: "succeeded",
      operationId: "operation-1",
      result: { invitationId: "invitation-1", status: "pending", generation: 1 },
    },
  )
  assert.deepEqual(database.calls[0], {
    name: "issue_company_member_invitation_v1",
    parameters: {
      p_company_id: "company-1",
      p_person_id: "person-1",
      p_target_email: "owner@example.com",
      p_intended_role: "owner",
      p_token_digest_hex: "digest-1",
      p_idempotency_key: "idem-1",
      p_correlation_id: "correlation-1",
    },
  })
  assert.equal("p_actor_user_id" in database.calls[0].parameters, false)
})

test("maps idempotent retry", async () => {
  const database = new RpcClientMock([
    success(
      { invitationId: "invitation-1", status: "accepted", membershipId: "membership-1" },
      "idempotent_retry",
    ),
  ])
  const persistence = createSupabaseTenantAccessTrustedPersistence(database)

  assert.equal(
    (await persistence.acceptInvitation({ ...context, tokenDigestHex: "digest-1" })).status,
    "idempotent_retry",
  )
})

test("maps conflict, denied and known failure without exposing SQL text", async () => {
  const database = new RpcClientMock([
    rpcResult({ status: "conflict", operationId: "operation-1", code: "TENANT_CONFLICT" }),
    rpcResult({ status: "denied", operationId: "operation-2", code: "TENANT_OWNER_AUTHORIZATION_INVALID" }),
    rpcResult({ status: "known_failure", operationId: "operation-3", code: "TENANT_INVITE_EXPIRED" }),
  ])
  const persistence = createSupabaseTenantAccessTrustedPersistence(database)

  assert.deepEqual(
    await persistence.changeMembershipRole({
      ...context,
      companyId: "company-1",
      membershipId: "membership-1",
      expectedRole: "employee",
      expectedStatus: "active",
      newRole: "manager",
    }),
    { status: "conflict", operationId: "operation-1", code: "TENANT_CONFLICT" },
  )
  assert.equal(
    (await persistence.acceptInvitation({ ...context, tokenDigestHex: "digest-1" })).status,
    "denied",
  )
  assert.equal(
    (await persistence.acceptInvitation({ ...context, tokenDigestHex: "digest-1" })).status,
    "known_failure",
  )
})

test("maps stable RPC error and collapses unknown persistence details", async () => {
  const database = new RpcClientMock([
    rpcError("42501: TENANT_AUTHORIZATION_DENIED internal detail"),
    rpcError("connection refused at private-host"),
  ])
  const persistence = createSupabaseTenantAccessTrustedPersistence(database)

  assert.deepEqual(
    await persistence.revokeInvitation({
      ...context,
      companyId: "company-1",
      invitationId: "invitation-1",
      expectedGeneration: 1,
    }),
    { status: "denied", code: "TENANT_AUTHORIZATION_DENIED" },
  )
  assert.deepEqual(
    await persistence.revokeInvitation({
      ...context,
      companyId: "company-1",
      invitationId: "invitation-1",
      expectedGeneration: 1,
    }),
    { status: "unexpected_persistence_failure", code: "TENANT_ACCESS_PERSISTENCE_FAILED" },
  )
})

test("fails closed on thrown adapter error and malformed result", async () => {
  const database = new RpcClientMock([Promise.reject(new Error("socket detail")), rpcResult({ status: "succeeded" })])
  const persistence = createSupabaseTenantAccessTrustedPersistence(database)

  assert.equal(
    (await persistence.acceptInvitation({ ...context, tokenDigestHex: "digest-1" })).status,
    "unexpected_persistence_failure",
  )
  assert.deepEqual(
    await persistence.acceptInvitation({ ...context, tokenDigestHex: "digest-1" }),
    { status: "unexpected_persistence_failure", code: "TENANT_ACCESS_INVALID_RESULT" },
  )
})

test("maps all remaining RPC parameters including ownership expected state", async () => {
  const database = new RpcClientMock([
    success({ invitationId: "invitation-1", status: "pending", generation: 2 }),
    success({ invitationId: "invitation-1", status: "revoked" }),
    success({ membershipId: "membership-1", status: "inactive", personId: null }),
    success({ targetMembershipId: "membership-2", targetRole: "owner", actorDemoted: true }),
  ])
  const persistence = createSupabaseTenantAccessTrustedPersistence(database)

  await persistence.resendInvitation({
    ...context,
    companyId: "company-1",
    invitationId: "invitation-1",
    expectedGeneration: 1,
    tokenDigestHex: "digest-2",
  })
  await persistence.revokeInvitation({
    ...context,
    companyId: "company-1",
    invitationId: "invitation-1",
    expectedGeneration: 2,
  })
  await persistence.deactivateMembership({
    ...context,
    companyId: "company-1",
    membershipId: "membership-1",
    expectedRole: "manager",
    expectedStatus: "active",
  })
  await persistence.transferOwnership({
    ...context,
    companyId: "company-1",
    targetMembershipId: "membership-2",
    expectedTargetRole: "admin",
    expectedActorRole: "owner",
    demoteActor: true,
  })

  assert.deepEqual(database.calls.map((call) => call.name), [
    "resend_company_member_invitation_v1",
    "revoke_company_member_invitation_v1",
    "deactivate_company_membership_v1",
    "transfer_company_ownership_v1",
  ])
  assert.deepEqual(database.calls[3].parameters, {
    p_company_id: "company-1",
    p_target_membership_id: "membership-2",
    p_expected_target_role: "admin",
    p_expected_actor_role: "owner",
    p_demote_actor: true,
    p_idempotency_key: "idem-1",
    p_correlation_id: "correlation-1",
  })
})

type RpcResponse = Readonly<{ data: unknown; error: unknown }>

function rpcResult(data: unknown): RpcResponse {
  return { data, error: null }
}

function success(result: unknown, status: "succeeded" | "idempotent_retry" = "succeeded"): RpcResponse {
  return rpcResult({ status, operationId: "operation-1", result })
}

function rpcError(message: string): RpcResponse {
  return { data: null, error: { message } }
}

class RpcClientMock implements TenantAccessRpcClient {
  readonly calls: Array<Readonly<{ name: string; parameters: Readonly<Record<string, unknown>> }>> = []

  constructor(private readonly responses: Array<RpcResponse | Promise<never>>) {}

  rpc(name: string, parameters: Readonly<Record<string, unknown>>): Promise<RpcResponse> {
    this.calls.push({ name, parameters })
    const response = this.responses.shift()
    assert.ok(response, `Missing RPC response for ${name}`)
    return Promise.resolve(response)
  }
}
