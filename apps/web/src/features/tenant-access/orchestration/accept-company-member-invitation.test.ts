import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { registerHooks } from "node:module"
import test from "node:test"

import type {
  AcceptTenantInvitationIntent,
  InvitationAcceptancePersistenceResult,
  TenantAccessApplicationResult,
} from "../application"
import type { AcceptCompanyMemberInvitationDependencies } from "./accept-company-member-invitation"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only" ? { shortCircuit: true, url: "server-only:test" } : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test" ? { format: "module", shortCircuit: true, source: "export {}" } : nextLoad(url, context)
  },
})

async function accept(...args: Parameters<typeof import("./accept-company-member-invitation")["acceptCompanyMemberInvitation"]>) {
  const orchestration = await import("./accept-company-member-invitation")
  return orchestration.acceptCompanyMemberInvitation(...args)
}

async function realDigest(rawToken: string) {
  const tokenModule = await import("../token")
  return tokenModule.digestInvitationToken(rawToken)
}

// 32 random bytes as unpadded base64url == 43 chars.
const VALID_RAW_TOKEN = "A".repeat(43)
const rpcInvitationId = "22222222-2222-4222-8222-222222222222"
const rpcMembershipId = "33333333-3333-4333-8333-333333333333"

function success(
  status: "succeeded" | "idempotent_retry" = "succeeded",
): TenantAccessApplicationResult<InvitationAcceptancePersistenceResult> {
  return {
    status,
    operationId: "operation-1",
    result: { invitationId: rpcInvitationId, membershipId: rpcMembershipId, status: "accepted" },
  }
}

function fixture(overrides: Partial<AcceptCompanyMemberInvitationDependencies> = {}) {
  const intents: AcceptTenantInvitationIntent[] = []
  const digested: string[] = []
  let contextLoads = 0
  let ids = 0
  const values = ["persistence-key", "correlation-id"]
  const dependencies: AcceptCompanyMemberInvitationDependencies = {
    loadAcceptorContext: async () => {
      contextLoads += 1
      return { status: "authenticated" }
    },
    createApplicationService: async () => ({
      acceptInvitation: async intent => {
        intents.push(intent)
        return success()
      },
    }),
    digestToken: rawToken => {
      digested.push(rawToken)
      // Deterministic 64-hex value that does NOT contain the raw token.
      return "f".repeat(64)
    },
    generateId: () => values[ids++] ?? "unexpected-id",
    ...overrides,
  }
  return { dependencies, intents, digested, ids: () => ids, contextLoads: () => contextLoads }
}

test("valid raw token converges to invitation_accepted", async () => {
  const state = fixture()
  assert.deepEqual(await accept(state.dependencies, { rawToken: VALID_RAW_TOKEN }), {
    status: "invitation_accepted",
    correlationId: "correlation-id",
  })
  assert.equal(state.contextLoads(), 1)
  assert.equal(state.intents.length, 1)
})

for (const persistenceStatus of ["succeeded", "idempotent_retry"] as const) {
  test(`${persistenceStatus} persistence converges to invitation_accepted`, async () => {
    const state = fixture({ createApplicationService: async () => ({
      acceptInvitation: async intent => {
        state.intents.push(intent)
        return success(persistenceStatus)
      },
    }) })
    assert.deepEqual(await accept(state.dependencies, { rawToken: VALID_RAW_TOKEN }), {
      status: "invitation_accepted",
      correlationId: "correlation-id",
    })
  })
}

for (const rawToken of [
  "",
  "A".repeat(42),
  "A".repeat(44),
  `${"A".repeat(42)}=`,
  `${"A".repeat(42)}+`,
  `${"A".repeat(42)}/`,
]) {
  test("invalid token format stops before context, digest and persistence", async () => {
    const state = fixture()
    const result = await accept(state.dependencies, { rawToken })
    assert.equal(result.status, "invalid_input")
    assert.equal(state.contextLoads(), 0)
    assert.equal(state.digested.length, 0)
    assert.equal(state.ids(), 0)
    assert.equal(state.intents.length, 0)
  })
}

test("canonical 43-char base64url token is accepted as valid format", async () => {
  const canonical = "abcdefghijklmnopqrstuvwxyz012345_ABCDEFGHI-"
  assert.equal(canonical.length, 43)
  const state = fixture()
  const result = await accept(state.dependencies, { rawToken: canonical })
  assert.equal(result.status, "invitation_accepted")
  assert.equal(state.digested[0], canonical)
})

test("client-supplied authority or secret fields are rejected as invalid_input", async () => {
  for (const extra of [
    { companyId: "client" },
    { personId: "client" },
    { targetEmail: "client@example.test" },
    { intendedRole: "owner" },
    { actorUserId: "client" },
    { generation: 9 },
    { tokenDigestHex: "f".repeat(64) },
    { idempotencyKey: "client-key" },
    { correlationId: "client-correlation" },
  ]) {
    const state = fixture()
    const result = await accept(state.dependencies, { rawToken: VALID_RAW_TOKEN, ...extra })
    assert.equal(result.status, "invalid_input")
    assert.equal(state.contextLoads(), 0)
    assert.equal(state.digested.length, 0)
    assert.equal(state.intents.length, 0)
  }
})

test("session_expired stops before digest, IDs and persistence", async () => {
  const state = fixture({ loadAcceptorContext: async () => ({ status: "session_expired" }) })
  assert.deepEqual(await accept(state.dependencies, { rawToken: VALID_RAW_TOKEN }), { status: "session_expired" })
  assert.equal(state.digested.length, 0)
  assert.equal(state.ids(), 0)
  assert.equal(state.intents.length, 0)
})

test("intent carries the real digest, server-side IDs, and never the raw token", async () => {
  const expectedDigest = await realDigest(VALID_RAW_TOKEN)
  const state = fixture({ digestToken: rawToken => {
    assert.equal(rawToken, VALID_RAW_TOKEN)
    return expectedDigest
  } })
  await accept(state.dependencies, { rawToken: VALID_RAW_TOKEN })
  assert.deepEqual(state.intents, [{
    tokenDigestHex: expectedDigest,
    idempotencyKey: "persistence-key",
    correlationId: "correlation-id",
  }])
  // Raw token must never appear inside the intent handed to the Application Service.
  assert.equal(JSON.stringify(state.intents[0]).includes(VALID_RAW_TOKEN), false)
  // Idempotency key and correlation ID are separately generated, server-side.
  assert.notEqual(state.intents[0]?.idempotencyKey, state.intents[0]?.correlationId)
})

const failures = [
  [{ status: "known_failure", code: "TENANT_INVITE_REVOKED" }, "revoked", undefined],
  [{ status: "known_failure", code: "TENANT_INVITE_EXPIRED" }, "expired", undefined],
  [{ status: "conflict", code: "TENANT_INVITE_ALREADY_ACCEPTED" }, "conflict", "already_accepted"],
  [{ status: "conflict", code: "TENANT_PERSON_ALREADY_LINKED" }, "conflict", "person_linked_other"],
  [{ status: "conflict", code: "TENANT_MEMBERSHIP_ALREADY_EXISTS" }, "conflict", "already_member"],
  [{ status: "known_failure", code: "TENANT_INVITE_NOT_FOUND" }, "not_found", undefined],
  [{ status: "known_failure", code: "TENANT_INVITE_IDENTITY_INVALID" }, "not_found", undefined],
  [{ status: "denied", code: "TENANT_INVITE_NOT_FOUND" }, "denied", undefined],
  [{ status: "denied", code: "AUTHENTICATION_REQUIRED" }, "session_expired", undefined],
  [{ status: "conflict", code: "TENANT_IDEMPOTENCY_CONFLICT" }, "failed", undefined],
  [{ status: "unexpected_persistence_failure", code: "TENANT_ACCESS_PERSISTENCE_FAILED" }, "failed", undefined],
] as const

for (const [persistence, expectedStatus, reason] of failures) {
  test(`${persistence.code}/${persistence.status} maps to ${expectedStatus} without leaking codes or secrets`, async () => {
    const expectedDigest = await realDigest(VALID_RAW_TOKEN)
    const state = fixture({
      digestToken: () => expectedDigest,
      createApplicationService: async () => ({
        acceptInvitation: async () => persistence as TenantAccessApplicationResult<InvitationAcceptancePersistenceResult>,
      }),
    })
    const result = await accept(state.dependencies, { rawToken: VALID_RAW_TOKEN })
    assert.equal(result.status, expectedStatus)
    if (reason && result.status === "conflict") assert.equal(result.reason, reason)
    const serialized = JSON.stringify(result)
    assert.equal(serialized.includes("TENANT_"), false)
    assert.equal(serialized.includes(VALID_RAW_TOKEN), false)
    assert.equal(serialized.includes(expectedDigest), false)
    assert.equal(serialized.includes("@"), false)
  })
}

test("no result leaks the raw token, digest, url or email", async () => {
  const expectedDigest = await realDigest(VALID_RAW_TOKEN)
  const state = fixture({ digestToken: () => expectedDigest })
  const result = await accept(state.dependencies, { rawToken: VALID_RAW_TOKEN })
  const serialized = JSON.stringify(result)
  assert.equal(serialized.includes(VALID_RAW_TOKEN), false)
  assert.equal(serialized.includes(expectedDigest), false)
  assert.equal(serialized.includes("/invite/"), false)
  assert.equal(serialized.includes("@"), false)
})

test("thrown persistence failure becomes a safe failed result", async () => {
  const state = fixture({ createApplicationService: async () => ({
    acceptInvitation: async () => { throw new Error("boom") },
  }) })
  const result = await accept(state.dependencies, { rawToken: VALID_RAW_TOKEN })
  assert.equal(result.status, "failed")
  assert.equal(JSON.stringify(result).includes("boom"), false)
})

test("runtime uses only context, application service, digest and ID dependencies; no protected access", async () => {
  const runtime = await readFile(new URL("./accept-company-member-invitation.ts", import.meta.url), "utf8")
  const action = await readFile(new URL("../actions/accept-company-member-invitation-action.ts", import.meta.url), "utf8")
  const combined = `${runtime}\n${action}`
  for (const forbidden of [
    /\.\.\/delivery/,
    /APP_BASE_URL/,
    /destinationEmail/,
    /invitationUrl/,
    /Resend/,
    /service_role/,
    /company_member_invitations/,
    /console\.(?:log|error)/,
    /loadCurrentUserContext/,
    /currentUser\.role|role\s*===\s*["'](?:owner|admin)/,
    /\.rpc\(/,
    /\.limit\(1\)/,
  ]) assert.doesNotMatch(combined, forbidden)
  // The orchestration itself must not import the token module; digest is injected.
  assert.doesNotMatch(runtime, /\.\.\/token/)
})
