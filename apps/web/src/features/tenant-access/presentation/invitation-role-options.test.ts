import assert from "node:assert/strict"
import test from "node:test"

import { getInvitationRoleOptionsForActor } from "./invitation-role-options"

test("owner can offer every role accepted by the invitation contract", () => {
  assert.deepEqual(
    getInvitationRoleOptionsForActor("owner").map((option) => option.value),
    ["owner", "admin", "hr", "manager", "employee"],
  )
})

test("admin cannot offer owner but can offer every non-owner role", () => {
  assert.deepEqual(
    getInvitationRoleOptionsForActor("admin").map((option) => option.value),
    ["admin", "hr", "manager", "employee"],
  )
})

test("roles without issue authority receive no UI options", () => {
  for (const role of ["hr", "manager", "employee"] as const) {
    assert.deepEqual(getInvitationRoleOptionsForActor(role), [])
  }
})
