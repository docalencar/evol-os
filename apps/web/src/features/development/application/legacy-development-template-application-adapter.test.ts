import assert from "node:assert/strict"
import test from "node:test"

import type { ApplyDevelopmentTemplateV2Result } from "./apply-development-template-v2"
import { createLegacyDevelopmentTemplateApplicationAdapter } from "./legacy-development-template-application-adapter"

const legacyInput = {
  employeeId: "employee-1",
  templateId: "template-1",
  ownerId: "owner-1",
  priority: "medium" as const,
  startDate: "2026-08-08",
  dueDate: "2026-09-08",
}

function createAdapter(result: ApplyDevelopmentTemplateV2Result) {
  const calls: unknown[] = []
  const adapter = createLegacyDevelopmentTemplateApplicationAdapter({
    async findPublishedTemplateVersionId(templateId) {
      assert.equal(templateId, "template-1")
      return "version-1"
    },
    async apply(input) {
      calls.push(input)
      return result
    },
    createId: (() => {
      const ids = ["application-1", "idempotency-1", "correlation-1"]
      return () => ids.shift() ?? "unexpected-id"
    })(),
    now: () => new Date("2026-08-08T12:00:00.000Z"),
  })
  return { adapter, calls }
}

test("preserves the legacy result while delegating to the additive contract", async () => {
  const { adapter, calls } = createAdapter({
    status: "created", applicationId: "application-1", planId: "plan-1", snapshotId: "snapshot-1",
  })
  assert.deepEqual(await adapter(legacyInput), { planId: "plan-1" })
  assert.deepEqual(calls, [{
    applicationId: "application-1", idempotencyKey: "idempotency-1",
    correlationId: "correlation-1", templateVersionId: "version-1",
    employeeId: "employee-1", ownerId: "owner-1", priority: "medium",
    startDate: "2026-08-08", dueDate: "2026-09-08",
    effectiveAt: "2026-08-08T12:00:00.000Z",
  }])
})

test("preserves an idempotent retry plan", async () => {
  const { adapter } = createAdapter({
    status: "idempotent_retry", applicationId: "application-1", planId: "plan-1", snapshotId: "snapshot-1",
  })
  assert.deepEqual(await adapter(legacyInput), { planId: "plan-1" })
})

test("propagates fingerprint conflicts", async () => {
  const { adapter } = createAdapter({
    status: "idempotency_conflict", applicationId: "application-1", code: "IDEMPOTENCY_FINGERPRINT_CONFLICT",
  })
  await assert.rejects(adapter(legacyInput), /IDEMPOTENCY_FINGERPRINT_CONFLICT/)
})

test("propagates resolver error codes", async () => {
  const { adapter } = createAdapter({
    status: "resolution_failure",
    errors: [{ code: "DEVELOPMENT_TEMPLATE_MAPPING_REQUIRED", path: "goals[0]" }],
    warnings: [],
  })
  await assert.rejects(adapter(legacyInput), /DEVELOPMENT_TEMPLATE_MAPPING_REQUIRED/)
})

test("propagates persistence error codes", async () => {
  const { adapter } = createAdapter({
    status: "persistence_failure", code: "DEVELOPMENT_TEMPLATE_PERSISTENCE_FAILED",
  })
  await assert.rejects(adapter(legacyInput), /DEVELOPMENT_TEMPLATE_PERSISTENCE_FAILED/)
})

test("does not invoke the application contract when no published version exists", async () => {
  let applyCalls = 0
  const adapter = createLegacyDevelopmentTemplateApplicationAdapter({
    async findPublishedTemplateVersionId() { throw new Error("DEVELOPMENT_TEMPLATE_VERSION_NOT_CONSUMABLE") },
    async apply() { applyCalls += 1; throw new Error("unexpected") },
    createId: () => "unused", now: () => new Date(0),
  })
  await assert.rejects(adapter(legacyInput), /DEVELOPMENT_TEMPLATE_VERSION_NOT_CONSUMABLE/)
  assert.equal(applyCalls, 0)
})

test("preserves the optional legacy date defaults without domain resolution", async () => {
  const { adapter, calls } = createAdapter({
    status: "created", applicationId: "application-1", planId: "plan-1", snapshotId: "snapshot-1",
  })
  await adapter({ ...legacyInput, startDate: undefined, dueDate: undefined })
  assert.equal((calls[0] as { startDate: string }).startDate, "2026-08-08")
})
