import assert from "node:assert/strict"
import test from "node:test"

import type { CurrentUserContext } from "@/features/authorization"

import {
  NotificationAuthorizationError,
  requireNotificationAdministrativeAccess,
  requireNotificationSelfAccess,
} from "./notification-authorization"

function actor(
  role: CurrentUserContext["role"] = "employee"
): CurrentUserContext {
  return { userId: "user-1", companyId: "company-1", role }
}

test("self access exige mesmo usuário e empresa", () => {
  assert.doesNotThrow(() =>
    requireNotificationSelfAccess(actor(), "company-1", "user-1")
  )
  assert.throws(
    () => requireNotificationSelfAccess(actor(), "company-1", "user-2"),
    NotificationAuthorizationError
  )
  assert.throws(
    () => requireNotificationSelfAccess(actor(), "company-2", "user-1"),
    NotificationAuthorizationError
  )
})

test("somente owner e admin possuem operação administrativa", () => {
  assert.doesNotThrow(() =>
    requireNotificationAdministrativeAccess(actor("owner"), "company-1")
  )
  assert.doesNotThrow(() =>
    requireNotificationAdministrativeAccess(actor("admin"), "company-1")
  )
  for (const role of ["hr", "manager", "employee"] as const) {
    assert.throws(
      () => requireNotificationAdministrativeAccess(actor(role), "company-1"),
      NotificationAuthorizationError
    )
  }
})
