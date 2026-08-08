import assert from "node:assert/strict"
import test from "node:test"

import { createDevelopmentTemplateConfirmationIdentity } from "./development-template-confirmation-identity"

test("creates one stable identity that can be reused by retries", () => {
  const ids = ["application-1", "idempotency-1", "correlation-1"]
  const identity = createDevelopmentTemplateConfirmationIdentity(
    () => ids.shift() ?? "unexpected",
    () => new Date("2026-08-08T12:00:00.000Z"),
  )
  const retryIdentity = identity
  assert.equal(retryIdentity.idempotencyKey, "idempotency-1")
  assert.strictEqual(retryIdentity, identity)
})

test("creates a new identity for a new human confirmation", () => {
  let sequence = 0
  const createId = () => `id-${++sequence}`
  const first = createDevelopmentTemplateConfirmationIdentity(createId, () => new Date(0))
  const second = createDevelopmentTemplateConfirmationIdentity(createId, () => new Date(0))
  assert.notEqual(first.applicationId, second.applicationId)
  assert.notEqual(first.idempotencyKey, second.idempotencyKey)
})
