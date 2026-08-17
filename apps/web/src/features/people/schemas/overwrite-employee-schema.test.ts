import assert from "node:assert/strict"
import { test } from "node:test"

import { overwriteEmployeeSchema } from "./employee-schema"

const complete = {
  fullName: "Ana Silva",
  email: "",
  phone: "",
  birthDate: "",
  hireDate: "",
  status: "active",
  teamId: "",
  positionId: "",
  managerId: "",
  discProfile: "",
} as const

function withoutKey(key: string): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...complete }
  delete copy[key]
  return copy
}

test("full-overwrite update contract accepts a complete payload", () => {
  assert.equal(overwriteEmployeeSchema.safeParse(complete).success, true)
})

test("a partial payload is rejected — omitting any field never silently erases it", () => {
  for (const key of Object.keys(complete)) {
    assert.equal(
      overwriteEmployeeSchema.safeParse(withoutKey(key)).success,
      false,
      `omitting "${key}" must be rejected`
    )
  }
})

test("omitted status is rejected, never coerced to active", () => {
  assert.equal(
    overwriteEmployeeSchema.safeParse(withoutKey("status")).success,
    false
  )
})

test("explicit empty values for nullable fields are accepted", () => {
  assert.equal(
    overwriteEmployeeSchema.safeParse({
      ...complete,
      email: "",
      teamId: "",
      managerId: "",
    }).success,
    true
  )
})

test("a valid full edit payload is accepted", () => {
  assert.equal(
    overwriteEmployeeSchema.safeParse({
      ...complete,
      email: "ana@example.com",
      status: "on_leave",
      teamId: "11111111-1111-4111-8111-111111111111",
    }).success,
    true
  )
})
