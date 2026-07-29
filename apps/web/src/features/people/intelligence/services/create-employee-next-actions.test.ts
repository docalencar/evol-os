import assert from "node:assert/strict"
import test from "node:test"

import { createEmployeeNextActions } from "./create-employee-next-actions"

const currentDate = new Date("2026-07-01T00:00:00.000Z")

function actionsFor(
  status: "active" | "completed",
  dueDate: string | null
) {
  return createEmployeeNextActions({
    criticalGap: null,
    activePlans: status === "active" ? 1 : 0,
    pendingAssessments: 0,
    nextDevelopmentPlan: { status, dueDate },
  }, currentDate)
}

test("createEmployeeNextActions recommends reviewing an overdue active plan", () => {
  assert.equal(actionsFor("active", "2026-06-30")[0]?.type, "review-development-plan")
})

test("createEmployeeNextActions includes an active plan due in exactly 30 days", () => {
  assert.equal(actionsFor("active", "2026-07-31")[0]?.type, "review-development-plan")
})

test("createEmployeeNextActions ignores an active plan due in 31 days", () => {
  assert.deepEqual(actionsFor("active", "2026-08-01"), [])
})

test("createEmployeeNextActions ignores a distant active plan", () => {
  assert.deepEqual(actionsFor("active", "2027-07-01"), [])
})

test("createEmployeeNextActions ignores an active plan without due date", () => {
  assert.deepEqual(actionsFor("active", null), [])
})

test("createEmployeeNextActions ignores a completed plan", () => {
  assert.deepEqual(actionsFor("completed", "2026-06-30"), [])
})

test("createEmployeeNextActions ignores an invalid due date", () => {
  assert.deepEqual(actionsFor("active", "invalid-date"), [])
})

test("createEmployeeNextActions handles absence of a development plan", () => {
  const actions = createEmployeeNextActions({
    criticalGap: null,
    activePlans: 0,
    pendingAssessments: 0,
    nextDevelopmentPlan: null,
  }, currentDate)

  assert.deepEqual(actions, [])
})
