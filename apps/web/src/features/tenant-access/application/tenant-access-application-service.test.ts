import assert from "node:assert/strict"
import test from "node:test"

import type { TenantAccessTrustedPersistence } from "./ports"
import { TenantAccessApplicationService } from "./tenant-access-application-service"

test("application service forwards trusted intent unchanged and adds no actor authority", async () => {
  const calls: unknown[] = []
  const persistence = {
    issueInvitation: async (intent: unknown) => {
      calls.push(intent)
      return { status: "known_failure", code: "TENANT_INVITE_NOT_FOUND" } as const
    },
  } as unknown as TenantAccessTrustedPersistence
  const service = new TenantAccessApplicationService(persistence)
  const intent = {
    companyId: "company-1",
    personId: "person-1",
    targetEmail: "person@example.com",
    intendedRole: "employee",
    tokenDigestHex: "digest-1",
    idempotencyKey: "idem-1",
    correlationId: "correlation-1",
  } as const

  assert.deepEqual(await service.issueInvitation(intent), {
    status: "known_failure",
    code: "TENANT_INVITE_NOT_FOUND",
  })
  assert.deepEqual(calls, [intent])
  assert.equal("actorUserId" in intent, false)
})
