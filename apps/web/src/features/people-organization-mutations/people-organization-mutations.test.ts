import assert from "node:assert/strict"
import { test } from "node:test"

import {
  PeopleOrganizationMutationError,
  publicMutationMessage,
  toMutationErrorCode,
  type PeopleOrganizationMutationErrorCode,
} from "./errors"
import {
  intentKey,
  normalizeEmptyToNull,
  submissionIdFromInput,
} from "./idempotency"
import {
  isValidSubmissionId,
  newSubmissionId,
} from "./submission-id"

const COMPANY = "11111111-1111-4111-8111-111111111111"
const COMPANY_B = "22222222-2222-4222-8222-222222222222"
const SUB_1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
const SUB_2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"

const ALL_CODES: PeopleOrganizationMutationErrorCode[] = [
  "AUTHENTICATION_REQUIRED",
  "TENANT_AUTHORIZATION_DENIED",
  "PERSON_NOT_FOUND",
  "ORGANIZATION_ENTITY_NOT_FOUND",
  "TENANT_REFERENCE_INVALID",
  "PERSON_ACCESS_CONFLICT",
  "ORGANIZATION_HIERARCHY_CYCLE",
  "VALIDATION_FAILED",
  "CONFLICT",
  "IDEMPOTENCY_CONFLICT",
  "UNKNOWN",
]

test("stable 0089 error messages map to their codes", () => {
  for (const code of ALL_CODES) {
    if (code === "UNKNOWN") continue
    assert.equal(toMutationErrorCode(code), code)
  }
})

test("substring collisions resolve to the specific code, not CONFLICT", () => {
  assert.equal(
    toMutationErrorCode("PERSON_ACCESS_CONFLICT"),
    "PERSON_ACCESS_CONFLICT"
  )
  assert.equal(
    toMutationErrorCode("IDEMPOTENCY_CONFLICT"),
    "IDEMPOTENCY_CONFLICT"
  )
  assert.equal(toMutationErrorCode("CONFLICT"), "CONFLICT")
})

test("unknown / raw DB errors fall back to UNKNOWN (fail-safe)", () => {
  assert.equal(toMutationErrorCode(null), "UNKNOWN")
  assert.equal(toMutationErrorCode(undefined), "UNKNOWN")
  assert.equal(toMutationErrorCode(""), "UNKNOWN")
  assert.equal(
    toMutationErrorCode(
      'permission denied for table people (SQLSTATE 42501)'
    ),
    "UNKNOWN"
  )
})

test("public messages never leak SQLSTATE / table / constraint internals", () => {
  for (const code of ALL_CODES) {
    const message = publicMutationMessage(code)
    assert.ok(message.length > 0)
    assert.doesNotMatch(
      message,
      /42501|permission denied|sqlstate|public\.|_fkey|constraint|relation|column|null value/i
    )
  }
})

test("error carries the mapped code and a safe public message", () => {
  const error = new PeopleOrganizationMutationError(
    "ORGANIZATION_HIERARCHY_CYCLE"
  )
  assert.equal(error.code, "ORGANIZATION_HIERARCHY_CYCLE")
  assert.equal(
    error.message,
    publicMutationMessage("ORGANIZATION_HIERARCHY_CYCLE")
  )
  assert.match(error.message, /ciclo/i)
  assert.equal(error.name, "PeopleOrganizationMutationError")
})

test("idempotency: the key is the submission id — content never defines identity", () => {
  // Same submission id → same key (double-click / retry converge). There is no
  // content argument at all: business data cannot change the identity.
  assert.equal(
    intentKey("person:create", COMPANY, SUB_1),
    intentKey("person:create", COMPANY, SUB_1)
  )
})

test("idempotency: a new submission id is a distinct intent even with identical data", () => {
  assert.notEqual(
    intentKey("person:create", COMPANY, SUB_1),
    intentKey("person:create", COMPANY, SUB_2)
  )
})

test("idempotency: tenant and operation scope the key", () => {
  assert.notEqual(
    intentKey("person:create", COMPANY, SUB_1),
    intentKey("person:create", COMPANY_B, SUB_1)
  )
  assert.notEqual(
    intentKey("person:create", COMPANY, SUB_1),
    intentKey("department:create", COMPANY, SUB_1)
  )
})

test("submission id contract: only a valid UUID token is accepted", () => {
  assert.equal(isValidSubmissionId(SUB_1), true)
  assert.equal(isValidSubmissionId(newSubmissionId()), true)
  assert.equal(isValidSubmissionId(""), false)
  assert.equal(isValidSubmissionId("   "), false)
  assert.equal(isValidSubmissionId(undefined), false)
  assert.equal(isValidSubmissionId(null), false)
  assert.equal(isValidSubmissionId("not-a-uuid"), false)
  assert.equal(isValidSubmissionId(`${Date.now()}-${Math.random()}`), false)
  assert.equal(isValidSubmissionId("a".repeat(200)), false)
  assert.equal(isValidSubmissionId(123), false)
})

test("submissionIdFromInput + isValidSubmissionId reject a missing/blank token", () => {
  assert.equal(isValidSubmissionId(submissionIdFromInput({})), false)
  assert.equal(
    isValidSubmissionId(submissionIdFromInput({ idempotencyKey: "" })),
    false
  )
  assert.equal(
    isValidSubmissionId(submissionIdFromInput({ idempotencyKey: SUB_1 })),
    true
  )
})

test("normalizeEmptyToNull collapses blank values only", () => {
  assert.equal(normalizeEmptyToNull(""), null)
  assert.equal(normalizeEmptyToNull("   "), null)
  assert.equal(normalizeEmptyToNull(null), null)
  assert.equal(normalizeEmptyToNull(undefined), null)
  assert.equal(normalizeEmptyToNull("Ana"), "Ana")
})

test("submissionIdFromInput reads a non-empty string token only", () => {
  assert.equal(submissionIdFromInput({ idempotencyKey: "abc" }), "abc")
  assert.equal(submissionIdFromInput({ idempotencyKey: "" }), undefined)
  assert.equal(submissionIdFromInput({ idempotencyKey: 123 }), undefined)
  assert.equal(submissionIdFromInput({}), undefined)
  assert.equal(submissionIdFromInput(null), undefined)
})
