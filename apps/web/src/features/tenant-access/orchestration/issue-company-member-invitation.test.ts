import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

import type { IssueTenantInvitationIntent, TenantAccessApplicationResult, InvitationPersistenceResult } from "../application"
import type { TenantInvitationDelivery, TenantInvitationDeliveryRequest, TenantInvitationDeliveryResult } from "../delivery"
import type { IssueCompanyMemberInvitationDependencies } from "./issue-company-member-invitation"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "server-only:test" }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === "server-only:test") {
      return { format: "module", shortCircuit: true, source: "export {}" }
    }
    return nextLoad(url, context)
  },
})

async function issueCompanyMemberInvitation(
  ...args: Parameters<typeof import("./issue-company-member-invitation")["issueCompanyMemberInvitation"]>
) {
  const orchestration = await import("./issue-company-member-invitation")
  return orchestration.issueCompanyMemberInvitation(...args)
}

class FakeDelivery implements TenantInvitationDelivery {
  readonly requests: TenantInvitationDeliveryRequest[] = []

  constructor(private readonly result: TenantInvitationDeliveryResult = { outcome: "accepted" }) {}

  async send(request: TenantInvitationDeliveryRequest): Promise<TenantInvitationDeliveryResult> {
    this.requests.push(request)
    return this.result
  }
}

const personId = "11111111-1111-4111-8111-111111111111"
const rawToken = "raw-secret-token"
const digestHex = "digest-secret-value"
const expiresAt = "2030-01-01T00:00:00.000Z"

function succeeded(status: "succeeded" | "idempotent_retry" = "succeeded"): TenantAccessApplicationResult<InvitationPersistenceResult> {
  return {
    status,
    operationId: "operation-1",
    result: {
      invitationId: "invitation-1",
      status: "pending",
      generation: 1,
      expiresAt,
    },
  }
}

function fixture(overrides: Partial<IssueCompanyMemberInvitationDependencies> = {}) {
  const intents: IssueTenantInvitationIntent[] = []
  let tokenGenerations = 0
  const delivery = new FakeDelivery()
  const ids = ["idempotency-1", "correlation-1"]
  const dependencies: IssueCompanyMemberInvitationDependencies = {
    loadTenantContext: async () => ({
      status: "resolved",
      companyId: "company-server",
      companyName: "Empresa Segura",
      findPersonEmail: async () => "person@server.example",
    }),
    createApplicationService: async () => ({
      issueInvitation: async intent => {
        intents.push(intent)
        return succeeded()
      },
    }),
    createDelivery: () => delivery,
    generateToken: () => {
      tokenGenerations += 1
      return { rawToken, digestHex }
    },
    generateId: () => ids.shift() ?? "unexpected-id",
    appBaseUrl: "https://app.example.com/base",
    ...overrides,
  }

  return { dependencies, intents, delivery, tokenGenerations: () => tokenGenerations }
}

const validInput = { personId, intendedRole: "employee" as const }

test("invalid input stops before context, persistence, token, and delivery", async () => {
  let contextLoads = 0
  const state = fixture({
    loadTenantContext: async () => {
      contextLoads += 1
      return { status: "tenant_selection_required" }
    },
  })

  const result = await issueCompanyMemberInvitation(state.dependencies, {
    personId: "not-a-uuid",
    intendedRole: "super-admin",
  })

  assert.equal(result.status, "invalid_input")
  assert.equal(contextLoads, 0)
  assert.equal(state.tokenGenerations(), 0)
  assert.equal(state.intents.length, 0)
  assert.equal(state.delivery.requests.length, 0)
})

test("tenant selection required stops before token, persistence, and delivery", async () => {
  const state = fixture({ loadTenantContext: async () => ({ status: "tenant_selection_required" }) })
  const result = await issueCompanyMemberInvitation(state.dependencies, validInput)

  assert.deepEqual(result, { status: "tenant_selection_required" })
  assert.equal(state.tokenGenerations(), 0)
  assert.equal(state.intents.length, 0)
  assert.equal(state.delivery.requests.length, 0)
})

test("missing People in the resolved tenant fails closed before persistence", async () => {
  const state = fixture({
    loadTenantContext: async () => ({
      status: "resolved",
      companyId: "company-server",
      companyName: "Empresa Segura",
      findPersonEmail: async () => null,
    }),
  })
  const result = await issueCompanyMemberInvitation(state.dependencies, validInput)

  assert.equal(result.status, "invalid_input")
  assert.equal(state.tokenGenerations(), 0)
  assert.equal(state.intents.length, 0)
  assert.equal(state.delivery.requests.length, 0)
})

for (const persistenceStatus of ["succeeded", "idempotent_retry"] as const) {
  test(`${persistenceStatus} persistence followed by accepted delivery returns invitation_sent`, async () => {
    const state = fixture({
      createApplicationService: async () => ({ issueInvitation: async intent => {
        state.intents.push(intent)
        return succeeded(persistenceStatus)
      } }),
    })
    const result = await issueCompanyMemberInvitation(state.dependencies, validInput)

    assert.deepEqual(result, {
      status: "invitation_sent",
      invitationId: "invitation-1",
      generation: 1,
      correlationId: "correlation-1",
    })
    assert.equal(state.delivery.requests.length, 1)
  })
}

test("server-derived company and email are passed to persistence", async () => {
  const state = fixture()
  await issueCompanyMemberInvitation(state.dependencies, validInput)

  assert.deepEqual(state.intents, [{
    companyId: "company-server",
    personId,
    targetEmail: "person@server.example",
    intendedRole: "employee",
    tokenDigestHex: digestHex,
    idempotencyKey: "idempotency-1",
    correlationId: "correlation-1",
  }])
})

test("delivery receives canonical persisted identity and omits unavailable inviter name", async () => {
  const state = fixture()
  await issueCompanyMemberInvitation(state.dependencies, validInput)

  assert.deepEqual(state.delivery.requests, [{
    destinationEmail: "person@server.example",
    invitationUrl: `https://app.example.com/invite/${rawToken}`,
    companyName: "Empresa Segura",
    intendedRole: "employee",
    expiresAt,
    invitationId: "invitation-1",
    generation: 1,
    correlationId: "correlation-1",
  }])
})

test("available inviter name is included without an extra orchestration lookup", async () => {
  const state = fixture({
    loadTenantContext: async () => ({
      status: "resolved",
      companyId: "company-server",
      companyName: "Empresa Segura",
      inviterName: "Ana",
      findPersonEmail: async () => "person@server.example",
    }),
  })
  await issueCompanyMemberInvitation(state.dependencies, validInput)

  assert.equal(state.delivery.requests[0]?.inviterName, "Ana")
})

const persistenceFailures = [
  [{ status: "conflict", code: "TENANT_CONFLICT" }, "conflict", "pending_invitation"],
  [{ status: "conflict", code: "TENANT_MEMBERSHIP_ALREADY_EXISTS" }, "conflict", "already_linked"],
  [{ status: "conflict", code: "TENANT_PERSON_ALREADY_LINKED" }, "conflict", "already_linked"],
  [{ status: "denied", code: "TENANT_AUTHORIZATION_DENIED" }, "denied", undefined],
  [{ status: "known_failure", code: "TENANT_INVITE_IDENTITY_INVALID" }, "invalid_input", undefined],
  [{ status: "unexpected_persistence_failure", code: "TENANT_ACCESS_PERSISTENCE_FAILED" }, "failed", undefined],
] as const

for (const [persistence, expectedStatus, expectedReason] of persistenceFailures) {
  test(`${persistence.status}/${persistence.code} maps safely and never delivers`, async () => {
    const state = fixture({
      createApplicationService: async () => ({
        issueInvitation: async () => persistence as TenantAccessApplicationResult<InvitationPersistenceResult>,
      }),
    })
    const result = await issueCompanyMemberInvitation(state.dependencies, validInput)

    assert.equal(result.status, expectedStatus)
    if (expectedReason && result.status === "conflict") assert.equal(result.reason, expectedReason)
    assert.equal(state.delivery.requests.length, 0)
  })
}

const deliveryOutcomes: readonly [TenantInvitationDeliveryResult, string][] = [
  [{ outcome: "transient_failure", category: "network" }, "invitation_created_delivery_failed"],
  [{ outcome: "permanent_failure", category: "invalid_recipient" }, "invitation_created_delivery_failed"],
  [{ outcome: "unknown", category: "timeout" }, "invitation_created_delivery_unknown"],
  [{ outcome: "configuration_failure", category: "authentication" }, "configuration_error"],
]

for (const [deliveryResult, expectedStatus] of deliveryOutcomes) {
  test(`${deliveryResult.outcome} maps after persistence`, async () => {
    const delivery = new FakeDelivery(deliveryResult)
    const state = fixture({ createDelivery: () => delivery })
    const result = await issueCompanyMemberInvitation(state.dependencies, validInput)

    assert.equal(state.intents.length, 1)
    assert.equal(delivery.requests.length, 1)
    assert.equal(result.status, expectedStatus)
  })
}

test("invalid APP_BASE_URL reports configuration error only after persistence", async () => {
  const state = fixture({ appBaseUrl: "invalid-url" })
  const result = await issueCompanyMemberInvitation(state.dependencies, validInput)

  assert.equal(state.intents.length, 1)
  assert.deepEqual(result, {
    status: "configuration_error",
    invitationId: "invitation-1",
    generation: 1,
    correlationId: "correlation-1",
  })
  assert.equal(state.delivery.requests.length, 0)
})

test("owner role is forwarded and authorization remains governed by persistence", async () => {
  const state = fixture({
    createApplicationService: async () => ({
      issueInvitation: async intent => {
        state.intents.push(intent)
        return { status: "denied", code: "OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER" }
      },
    }),
  })
  const result = await issueCompanyMemberInvitation(state.dependencies, {
    personId,
    intendedRole: "owner",
  })

  assert.equal(state.intents[0]?.intendedRole, "owner")
  assert.equal(result.status, "denied")
  assert.equal(state.delivery.requests.length, 0)
})

test("public input is strict and rejects every server-derived authority field", async () => {
  const state = fixture()
  const result = await issueCompanyMemberInvitation(state.dependencies, {
    ...validInput,
    companyId: "client-company",
    actorUserId: "client-actor",
    targetEmail: "client@example.com",
  })

  assert.equal(result.status, "invalid_input")
  assert.equal(state.intents.length, 0)
})

test("safe action result never leaks token, digest, URL, destination, provider, or SQL data", async () => {
  const state = fixture()
  const result = await issueCompanyMemberInvitation(state.dependencies, validInput)
  const serialized = JSON.stringify(result)

  for (const secret of [
    rawToken,
    digestHex,
    "invite/",
    "person@server.example",
    "RESEND_API_KEY",
    "provider raw error",
    "Postgres",
    "SQL",
  ]) {
    assert.equal(serialized.includes(secret), false)
  }
})
