import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { registerHooks } from "node:module"
import test from "node:test"

import type { ResendTenantInvitationIntent, ResentInvitationPersistenceResult, TenantAccessApplicationResult } from "../application"
import type { TenantInvitationDelivery, TenantInvitationDeliveryRequest, TenantInvitationDeliveryResult } from "../delivery"
import type { ResendCompanyMemberInvitationDependencies } from "./resend-company-member-invitation"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only" ? { shortCircuit: true, url: "server-only:test" } : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test"
      ? { format: "module", shortCircuit: true, source: "export {}" }
      : nextLoad(url, context)
  },
})

async function resend(...args: Parameters<typeof import("./resend-company-member-invitation")["resendCompanyMemberInvitation"]>) {
  const orchestration = await import("./resend-company-member-invitation")
  return orchestration.resendCompanyMemberInvitation(...args)
}

class FakeDelivery implements TenantInvitationDelivery {
  readonly requests: TenantInvitationDeliveryRequest[] = []
  constructor(private readonly result: TenantInvitationDeliveryResult = { outcome: "accepted" }) {}
  async send(request: TenantInvitationDeliveryRequest): Promise<TenantInvitationDeliveryResult> {
    this.requests.push(request)
    return this.result
  }
}

const invitationId = "11111111-1111-4111-8111-111111111111"
const rpcInvitationId = "22222222-2222-4222-8222-222222222222"
const rawToken = "new-raw-secret"
const digestHex = "new-digest-secret"
const expiresAt = "2030-02-01T00:00:00.000Z"
const validInput = { invitationId, expectedGeneration: 4 }

function success(status: "succeeded" | "idempotent_retry" = "succeeded"): TenantAccessApplicationResult<ResentInvitationPersistenceResult> {
  return {
    status,
    operationId: "operation-1",
    result: {
      invitationId: rpcInvitationId,
      status: "pending",
      generation: 5,
      destinationEmail: "rpc@destination.example",
      intendedRole: "owner",
      expiresAt,
    },
  }
}

function fixture(overrides: Partial<ResendCompanyMemberInvitationDependencies> = {}) {
  const intents: ResendTenantInvitationIntent[] = []
  const delivery = new FakeDelivery()
  let tokens = 0
  let ids = 0
  const idValues = ["persistence-key", "correlation-id"]
  const dependencies: ResendCompanyMemberInvitationDependencies = {
    loadTenantContext: async () => ({
      status: "resolved",
      companyId: "server-company",
      companyName: "Empresa RPC",
    }),
    createApplicationService: async () => ({
      resendInvitation: async intent => {
        intents.push(intent)
        return success()
      },
    }),
    createDelivery: () => delivery,
    generateToken: () => {
      tokens += 1
      return { rawToken, digestHex }
    },
    generateId: () => idValues[ids++] ?? "unexpected-id",
    appBaseUrl: "https://app.example.com/root",
    ...overrides,
  }
  return { dependencies, intents, delivery, tokens: () => tokens, ids: () => ids }
}

for (const input of [
  { invitationId: "invalid", expectedGeneration: 1 },
  { invitationId, expectedGeneration: 0 },
  { invitationId, expectedGeneration: 1.5 },
  { ...validInput, companyId: "client-company" },
]) {
  test("invalid or expanded public input stops before context and side effects", async () => {
    let contextLoads = 0
    const state = fixture({ loadTenantContext: async () => {
      contextLoads += 1
      return { status: "tenant_selection_required" }
    } })
    const result = await resend(state.dependencies, input)
    assert.equal(result.status, "invalid_input")
    assert.equal(contextLoads, 0)
    assert.equal(state.tokens(), 0)
    assert.equal(state.intents.length, 0)
    assert.equal(state.delivery.requests.length, 0)
  })
}

for (const contextStatus of ["session_expired", "no_membership", "tenant_selection_required"] as const) {
  test(`${contextStatus} returns before token, persistence, and delivery`, async () => {
    const state = fixture({ loadTenantContext: async () => ({ status: contextStatus }) })
    const result = await resend(state.dependencies, validInput)
    assert.deepEqual(result, { status: contextStatus })
    assert.equal(state.tokens(), 0)
    assert.equal(state.intents.length, 0)
    assert.equal(state.delivery.requests.length, 0)
  })
}

for (const persistenceStatus of ["succeeded", "idempotent_retry"] as const) {
  test(`${persistenceStatus} plus accepted delivery returns invitation_sent`, async () => {
    const state = fixture({ createApplicationService: async () => ({ resendInvitation: async intent => {
      state.intents.push(intent)
      return success(persistenceStatus)
    } }) })
    const result = await resend(state.dependencies, validInput)
    assert.deepEqual(result, {
      status: "invitation_sent",
      invitationId: rpcInvitationId,
      generation: 5,
      correlationId: "correlation-id",
    })
    assert.equal(state.tokens(), 1)
    assert.equal(state.ids(), 2)
  })
}

test("persistence receives server tenant, expected generation, digest, and separate generated IDs", async () => {
  const state = fixture()
  await resend(state.dependencies, validInput)
  assert.deepEqual(state.intents, [{
    companyId: "server-company",
    invitationId,
    expectedGeneration: 4,
    tokenDigestHex: digestHex,
    idempotencyKey: "persistence-key",
    correlationId: "correlation-id",
  }])
  assert.notEqual(state.intents[0]?.idempotencyKey, state.intents[0]?.correlationId)
})

test("delivery uses only the canonical 0075 result and server context", async () => {
  const state = fixture()
  await resend(state.dependencies, validInput)
  assert.deepEqual(state.delivery.requests, [{
    destinationEmail: "rpc@destination.example",
    invitationUrl: `https://app.example.com/invite/${rawToken}`,
    companyName: "Empresa RPC",
    intendedRole: "owner",
    expiresAt,
    invitationId: rpcInvitationId,
    generation: 5,
    correlationId: "correlation-id",
  }])
})

test("inviter name is included only when available", async () => {
  const state = fixture({ loadTenantContext: async () => ({
    status: "resolved",
    companyId: "server-company",
    companyName: "Empresa RPC",
    inviterName: "Ana",
  }) })
  await resend(state.dependencies, validInput)
  assert.equal(state.delivery.requests[0]?.inviterName, "Ana")
})

const failures = [
  [{ status: "conflict", code: "TENANT_CONFLICT" }, "conflict", "stale_generation"],
  [{ status: "known_failure", code: "TENANT_INVITE_REVOKED" }, "conflict", "revoked"],
  [{ status: "known_failure", code: "TENANT_INVITE_ALREADY_ACCEPTED" }, "conflict", "already_accepted"],
  [{ status: "known_failure", code: "TENANT_INVITE_NOT_FOUND" }, "invalid_input", undefined],
  [{ status: "denied", code: "TENANT_AUTHORIZATION_DENIED" }, "denied", undefined],
  [{ status: "denied", code: "OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER" }, "denied", undefined],
  [{ status: "conflict", code: "TENANT_IDEMPOTENCY_CONFLICT" }, "failed", undefined],
  [{ status: "unexpected_persistence_failure", code: "TENANT_ACCESS_PERSISTENCE_FAILED" }, "failed", undefined],
] as const

for (const [persistence, expectedStatus, reason] of failures) {
  test(`${persistence.code} maps safely and never delivers`, async () => {
    const state = fixture({ createApplicationService: async () => ({
      resendInvitation: async () => persistence as TenantAccessApplicationResult<ResentInvitationPersistenceResult>,
    }) })
    const result = await resend(state.dependencies, validInput)
    assert.equal(result.status, expectedStatus)
    if (reason && result.status === "conflict") assert.equal(result.reason, reason)
    assert.equal(state.delivery.requests.length, 0)
  })
}

const deliveryCases: readonly [TenantInvitationDeliveryResult, string][] = [
  [{ outcome: "transient_failure", category: "network" }, "invitation_updated_delivery_failed"],
  [{ outcome: "permanent_failure", category: "invalid_recipient" }, "invitation_updated_delivery_failed"],
  [{ outcome: "unknown", category: "timeout" }, "invitation_updated_delivery_unknown"],
  [{ outcome: "configuration_failure", category: "authentication" }, "configuration_error"],
]

for (const [deliveryResult, expectedStatus] of deliveryCases) {
  test(`${deliveryResult.outcome} reflects an already persisted resend`, async () => {
    const delivery = new FakeDelivery(deliveryResult)
    const state = fixture({ createDelivery: () => delivery })
    const result = await resend(state.dependencies, validInput)
    assert.equal(state.intents.length, 1)
    assert.equal(delivery.requests.length, 1)
    assert.equal(result.status, expectedStatus)
  })
}

test("invalid APP_BASE_URL returns configuration_error after persistence", async () => {
  const state = fixture({ appBaseUrl: "invalid" })
  const result = await resend(state.dependencies, validInput)
  assert.equal(state.intents.length, 1)
  assert.deepEqual(result, {
    status: "configuration_error",
    invitationId: rpcInvitationId,
    generation: 5,
    correlationId: "correlation-id",
  })
  assert.equal(state.delivery.requests.length, 0)
})

test("result never exposes delivery context or secrets", async () => {
  const state = fixture()
  const result = await resend(state.dependencies, validInput)
  const serialized = JSON.stringify(result)
  for (const forbidden of [rawToken, digestHex, "rpc@destination.example", "invite/", expiresAt, "owner", "TENANT_"]) {
    assert.equal(serialized.includes(forbidden), false)
  }
})

test("runtime has no direct invitation read, service role, logging, or TypeScript role gate", async () => {
  const source = await readFile(new URL("./resend-company-member-invitation.ts", import.meta.url), "utf8")
  const action = await readFile(new URL("../actions/resend-company-member-invitation-action.ts", import.meta.url), "utf8")
  const combined = `${source}\n${action}`
  assert.doesNotMatch(combined, /company_member_invitations/)
  assert.doesNotMatch(combined, /service_role/)
  assert.doesNotMatch(combined, /console\.(?:log|error|warn|info)/)
  assert.doesNotMatch(combined, /currentUser\.role|role\s*===\s*["'](?:owner|admin)/)
  assert.doesNotMatch(combined, /\.limit\(1\)/)
})
