import assert from "node:assert/strict"
import test from "node:test"
import type {
  PlanningScenarioContract,
  PublishedSnapshotContract,
} from "../../types/planning-contracts"
import type {
  DepartmentMutableField,
  PositionMutableField,
  TeamMutableField,
} from "../contracts"
import { ProjectionContext } from "./projection-context"

const snapshot: PublishedSnapshotContract = Object.freeze({
  id: "snapshot-1",
  companyId: "company-1",
  workspaceId: "workspace-1",
  sourceScenarioId: null,
  version: 1,
  publishedAt: new Date("2026-01-01T00:00:00.000Z"),
})

const scenario: PlanningScenarioContract = Object.freeze({
  id: "scenario-1",
  companyId: "company-1",
  workspaceId: "workspace-1",
  baseSnapshotId: "snapshot-1",
  name: "Cenário",
  description: null,
  status: "draft",
  version: 1,
  createdAt: new Date("2026-01-02T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
})

function emptyContext() {
  return ProjectionContext.create(snapshot, scenario, [])
}

test("ProjectionContext deep-freezes changedFields for team.updated", () => {
  const changedFields: TeamMutableField[] = ["name"]

  const context = emptyContext().addEvent({
    type: "team.updated",
    changeSetId: "change-1",
    teamId: "team-1",
    changedFields,
  })

  changedFields.push("code")

  const stored = context.events[0]

  assert.equal(stored?.type, "team.updated")

  if (stored?.type !== "team.updated") {
    return
  }

  assert.deepEqual(stored.changedFields, ["name"])
  assert.equal(Object.isFrozen(stored.changedFields), true)
})

test("ProjectionContext deep-freezes changedFields for position.updated", () => {
  const changedFields: PositionMutableField[] = ["name"]

  const context = emptyContext().addEvent({
    type: "position.updated",
    changeSetId: "change-1",
    positionId: "position-1",
    changedFields,
  })

  changedFields.push("description")

  const stored = context.events[0]

  assert.equal(stored?.type, "position.updated")

  if (stored?.type !== "position.updated") {
    return
  }

  assert.deepEqual(stored.changedFields, ["name"])
  assert.equal(Object.isFrozen(stored.changedFields), true)
})

test("ProjectionContext preserves the deep freeze for department.updated", () => {
  const changedFields: DepartmentMutableField[] = ["name"]

  const context = emptyContext().addEvent({
    type: "department.updated",
    changeSetId: "change-1",
    departmentId: "department-1",
    changedFields,
  })

  changedFields.push("code")

  const stored = context.events[0]

  assert.equal(stored?.type, "department.updated")

  if (stored?.type !== "department.updated") {
    return
  }

  assert.deepEqual(stored.changedFields, ["name"])
  assert.equal(Object.isFrozen(stored.changedFields), true)
})
