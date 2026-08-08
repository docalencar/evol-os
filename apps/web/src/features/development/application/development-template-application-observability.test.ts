import assert from "node:assert/strict"
import test from "node:test"

import {
  createDevelopmentTemplateApplicationObserver,
  type SafeDevelopmentTemplateApplicationObservation,
} from "./development-template-application-observability"

test("records only the approved safe observability envelope", () => {
  const events: SafeDevelopmentTemplateApplicationObservation[] = []
  const observer = createDevelopmentTemplateApplicationObserver((event) => events.push(event))
  observer.record({
    operation: "apply", applicationId: "application-1", correlationId: "correlation-1",
    idempotencyKey: "key-1", outcome: "conflict", failureCode: "IDEMPOTENCY_FINGERPRINT_CONFLICT",
  })
  assert.deepEqual(Object.keys(events[0] ?? {}).sort(), [
    "applicationId", "correlationId", "failureCode", "idempotencyKeyHash", "operation", "outcome",
  ])
  assert.equal(events[0]?.idempotencyKeyHash.length, 64)
  assert.equal(JSON.stringify(events).includes("key-1"), false)
  assert.equal(JSON.stringify(events).includes("service_role"), false)
  assert.equal(JSON.stringify(events).includes("stack"), false)
})
