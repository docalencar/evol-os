import assert from "node:assert/strict"
import test from "node:test"

import type { Employee } from "@/features/people"

import { getTemplateApplicationPresentation } from "./get-template-application-presentation"

const person = (id: string, managerId: string | null, status: Employee["status"] = "active") => ({
  id,
  manager_id: managerId,
  status,
  full_name: id,
} as Employee)

const people = [
  person("manager", null),
  person("direct-active", "manager"),
  person("direct-leave", "manager", "on_leave"),
  person("unrelated", "other-manager"),
  person("terminated-direct", "manager", "terminated"),
]

test("manager presentation contains only current direct reports and fixes ownership", () => {
  const result = getTemplateApplicationPresentation({
    people,
    actorPersonId: "manager",
    actorRole: "manager",
  })
  assert.deepEqual(result?.targets.map((target) => target.id), ["direct-active", "direct-leave"])
  assert.deepEqual(result?.owners.map((owner) => owner.id), ["manager"])
  assert.equal(result?.fixedOwnerId, "manager")
})

test("unrelated employees are not presented to a manager", () => {
  const result = getTemplateApplicationPresentation({ people, actorPersonId: "manager", actorRole: "manager" })
  assert.equal(result?.targets.some((target) => target.id === "unrelated"), false)
  assert.equal(result?.targets.some((target) => target.id === "terminated-direct"), false)
})

test("owner, admin and HR retain application presentation while employees do not", () => {
  for (const actorRole of ["owner", "admin", "hr"] as const) {
    const result = getTemplateApplicationPresentation({ people, actorPersonId: null, actorRole })
    assert.ok(result)
    assert.equal(result.fixedOwnerId, null)
  }
  assert.equal(getTemplateApplicationPresentation({ people, actorPersonId: "unrelated", actorRole: "employee" }), null)
})
