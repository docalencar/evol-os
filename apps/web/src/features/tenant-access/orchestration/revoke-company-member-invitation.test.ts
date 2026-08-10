import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { registerHooks } from "node:module"
import test from "node:test"

import type { InvitationPersistenceResult, RevokeTenantInvitationIntent, TenantAccessApplicationResult } from "../application"
import type { RevokeCompanyMemberInvitationDependencies } from "./revoke-company-member-invitation"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only" ? { shortCircuit: true, url: "server-only:test" } : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test" ? { format: "module", shortCircuit: true, source: "export {}" } : nextLoad(url, context)
  },
})

async function revoke(...args: Parameters<typeof import("./revoke-company-member-invitation")["revokeCompanyMemberInvitation"]>) {
  const orchestration = await import("./revoke-company-member-invitation")
  return orchestration.revokeCompanyMemberInvitation(...args)
}

const invitationId = "11111111-1111-4111-8111-111111111111"
const rpcInvitationId = "22222222-2222-4222-8222-222222222222"
const validInput = { invitationId, expectedGeneration: 4 }

function success(status: "succeeded" | "idempotent_retry" = "succeeded"): TenantAccessApplicationResult<InvitationPersistenceResult> {
  return {
    status,
    operationId: "operation-1",
    result: { invitationId: rpcInvitationId, status: "revoked" },
  }
}

function fixture(overrides: Partial<RevokeCompanyMemberInvitationDependencies> = {}) {
  const intents: RevokeTenantInvitationIntent[] = []
  let ids = 0
  const values = ["persistence-key", "correlation-id"]
  const dependencies: RevokeCompanyMemberInvitationDependencies = {
    loadTenantContext: async () => ({ status: "resolved", companyId: "server-company" }),
    createApplicationService: async () => ({ revokeInvitation: async intent => {
      intents.push(intent)
      return success()
    } }),
    generateId: () => values[ids++] ?? "unexpected-id",
    ...overrides,
  }
  return { dependencies, intents, ids: () => ids }
}

for (const input of [
  { invitationId: "invalid", expectedGeneration: 1 },
  { invitationId, expectedGeneration: 0 },
  { invitationId, expectedGeneration: 1.5 },
  { ...validInput, actorUserId: "client", companyId: "client" },
]) {
  test("invalid or expanded input stops before context and persistence", async () => {
    let loads = 0
    const state = fixture({ loadTenantContext: async () => {
      loads += 1
      return { status: "resolved", companyId: "server-company" }
    } })
    const result = await revoke(state.dependencies, input)
    assert.equal(result.status, "invalid_input")
    assert.equal(loads, 0)
    assert.equal(state.ids(), 0)
    assert.equal(state.intents.length, 0)
  })
}

for (const status of ["session_expired", "no_membership", "tenant_selection_required"] as const) {
  test(`${status} stops before IDs and persistence`, async () => {
    const state = fixture({ loadTenantContext: async () => ({ status }) })
    assert.deepEqual(await revoke(state.dependencies, validInput), { status })
    assert.equal(state.ids(), 0)
    assert.equal(state.intents.length, 0)
  })
}

for (const persistenceStatus of ["succeeded", "idempotent_retry"] as const) {
  test(`${persistenceStatus} converges to invitation_revoked`, async () => {
    const state = fixture({ createApplicationService: async () => ({ revokeInvitation: async intent => {
      state.intents.push(intent)
      return success(persistenceStatus)
    } }) })
    assert.deepEqual(await revoke(state.dependencies, validInput), {
      status: "invitation_revoked",
      invitationId: rpcInvitationId,
      correlationId: "correlation-id",
    })
  })
}

test("already-revoked persistence success converges without exposing generation", async () => {
  const state = fixture()
  const result = await revoke(state.dependencies, validInput)
  assert.equal(result.status, "invitation_revoked")
  assert.equal("generation" in result, false)
})

test("intent uses server tenant, expected generation, and separate generated IDs", async () => {
  const state = fixture()
  await revoke(state.dependencies, validInput)
  assert.deepEqual(state.intents, [{
    companyId: "server-company",
    invitationId,
    expectedGeneration: 4,
    idempotencyKey: "persistence-key",
    correlationId: "correlation-id",
  }])
  assert.notEqual(state.intents[0]?.idempotencyKey, state.intents[0]?.correlationId)
})

const failures = [
  [{ status: "conflict", code: "TENANT_CONFLICT" }, "conflict", "stale_generation"],
  [{ status: "known_failure", code: "TENANT_INVITE_ALREADY_ACCEPTED" }, "conflict", "already_accepted"],
  [{ status: "known_failure", code: "TENANT_INVITE_NOT_FOUND" }, "invalid_input", undefined],
  [{ status: "denied", code: "TENANT_AUTHORIZATION_DENIED" }, "denied", undefined],
  [{ status: "denied", code: "OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER" }, "denied", undefined],
  [{ status: "conflict", code: "TENANT_IDEMPOTENCY_CONFLICT" }, "failed", undefined],
  [{ status: "unexpected_persistence_failure", code: "TENANT_ACCESS_PERSISTENCE_FAILED" }, "failed", undefined],
] as const

for (const [persistence, expectedStatus, reason] of failures) {
  test(`${persistence.code} maps without leaking its stable code`, async () => {
    const state = fixture({ createApplicationService: async () => ({
      revokeInvitation: async () => persistence as TenantAccessApplicationResult<InvitationPersistenceResult>,
    }) })
    const result = await revoke(state.dependencies, validInput)
    assert.equal(result.status, expectedStatus)
    if (reason && result.status === "conflict") assert.equal(result.reason, reason)
    assert.equal(JSON.stringify(result).includes("TENANT_"), false)
  })
}

test("runtime has only context, application service, and ID dependencies", async () => {
  const runtime = await readFile(new URL("./revoke-company-member-invitation.ts", import.meta.url), "utf8")
  const action = await readFile(new URL("../actions/revoke-company-member-invitation-action.ts", import.meta.url), "utf8")
  const combined = `${runtime}\n${action}`
  for (const forbidden of [
    /\.\.\/token/,
    /\.\.\/delivery/,
    /APP_BASE_URL/,
    /destinationEmail/,
    /invitationUrl/,
    /Resend/,
    /service_role/,
    /company_member_invitations/,
    /console\.(?:log|error)/,
    /currentUser\.role|role\s*===\s*["'](?:owner|admin)/,
    /\.limit\(1\)/,
  ]) assert.doesNotMatch(combined, forbidden)
})
