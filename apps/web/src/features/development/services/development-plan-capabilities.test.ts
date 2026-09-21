import assert from "node:assert/strict"
import test from "node:test"

import type { Employee } from "@/features/people"

import type { DevelopmentPlan } from "../types/development-plan"
import { getPlanCompletionPrerequisites, resolveDevelopmentPlanCapabilities } from "./development-plan-capabilities"

const plan = {
  id: "plan", companyId: "company", employeeId: "subject", ownerId: "owner",
  templateId: null, title: "PDI", description: null, status: "active" as const,
  priority: "medium" as const, startDate: null, dueDate: null, completedAt: null,
  createdAt: "2026-01-01", updatedAt: "2026-01-01", version: 1,
  totalActions: 2, completedActions: 1, skippedActions: 1, progressPercent: 100,
} satisfies DevelopmentPlan

const subject = { id: "subject", manager_id: "manager", status: "active" } as Employee

test("subject sees execution but not management controls", () => {
  const capabilities = resolveDevelopmentPlanCapabilities({ plan, subject, owner: null, actorPersonId: "subject", actorRole: "employee" })
  assert.equal(capabilities.canExecuteActions, true)
  assert.equal(capabilities.canSkipActions, false)
  assert.equal(capabilities.canRecordReview, false)
})

test("manager, explicit owner and administrator see management controls", () => {
  for (const actor of [
    { actorPersonId: "manager", actorRole: "manager" as const },
    { actorPersonId: "owner", actorRole: "employee" as const },
    { actorPersonId: null, actorRole: "admin" as const },
  ]) {
    const capabilities = resolveDevelopmentPlanCapabilities({ plan, subject, owner: { ...subject, id: "owner", status: "active" }, ...actor })
    assert.equal(capabilities.canSkipActions, true)
    assert.equal(capabilities.canRecordReview, true)
    assert.equal(capabilities.canCompletePlan, true)
  }
})

test("terminal plans advertise no mutations", () => {
  for (const status of ["completed", "cancelled"] as const) {
    const capabilities = resolveDevelopmentPlanCapabilities({ plan: { ...plan, status }, subject, owner: null, actorPersonId: "owner", actorRole: "owner" })
    assert.deepEqual(capabilities, {
      canActivate: false, canCompletePlan: false, canExecuteActions: false,
      canManage: true, canRecordReview: false, canSkipActions: false,
    })
  }
})

test("completion presentation requires canonical action state and final review", () => {
  assert.equal(getPlanCompletionPrerequisites(plan, []).ready, false)
  assert.equal(getPlanCompletionPrerequisites(plan, [{
    id: "review", planId: plan.id, reviewerId: "owner", type: "final",
    reviewedAt: "2026-01-02", summary: "Final", nextStep: null, createdAt: "2026-01-02",
  }]).ready, true)
})
