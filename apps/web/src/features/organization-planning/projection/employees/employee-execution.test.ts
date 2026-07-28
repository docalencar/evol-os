import assert from "node:assert/strict"
import test from "node:test"
import type {
  ChangeSet,
  PlanningScenarioContract,
  PublishedSnapshotContract,
} from "../../types/planning-contracts"
import { ProjectionContext } from "../context"
import { ProjectionEngine } from "../engine"
import { EmployeeExecutor } from "../executors"
import { ProjectionPipeline } from "../pipeline"

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

function employeeChangeSet(
  id: string,
  version: number,
  changeType: string,
  payload: Readonly<Record<string, unknown>>,
  scope: { companyId?: string; scenarioId?: string } = {}
): ChangeSet {
  return Object.freeze({
    id,
    companyId: scope.companyId ?? "company-1",
    scenarioId: scope.scenarioId ?? "scenario-1",
    changeType,
    payload: Object.freeze({ ...payload }),
    version,
  })
}

test("ProjectionEngine creates an unassigned employee and counts headcount", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      employeeChangeSet("change-1", 1, "employee.create", {
        employeeId: "employee-1",
        positionId: null,
      }),
    ],
  })

  assert.equal(result.isValid, true)
  assert.deepEqual(result.organization.employees, [
    { id: "employee-1", positionId: null },
  ])
  assert.equal(result.metrics.headcount, 1)
  assert.deepEqual(result.warnings, [])
})

test("EmployeeExecutor records execution as a projection event", () => {
  const context = ProjectionContext.create(snapshot, scenario, [
    employeeChangeSet("change-1", 1, "employee.create", {
      employeeId: "employee-1",
      positionId: null,
    }),
  ])

  const projected = new ProjectionPipeline([
    new EmployeeExecutor(),
  ]).execute(context)

  assert.deepEqual(projected.events, [
    {
      type: "change-set.executed",
      changeSetId: "change-1",
      executor: "EmployeeExecutor",
    },
  ])
})

test("ProjectionEngine applies employee change sets in version order", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      employeeChangeSet("change-b", 2, "employee.create", {
        employeeId: "employee-2",
        positionId: null,
      }),
      employeeChangeSet("change-a", 1, "employee.create", {
        employeeId: "employee-1",
        positionId: null,
      }),
    ],
  })

  assert.equal(result.isValid, true)
  assert.deepEqual(
    result.organization.employees.map(
      (employee) => employee.id
    ),
    ["employee-1", "employee-2"]
  )
})

test("ProjectionEngine keeps the employee state immutable", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      employeeChangeSet("change-1", 1, "employee.create", {
        employeeId: "employee-1",
        positionId: null,
      }),
    ],
  })

  assert.equal(
    Object.isFrozen(result.organization.employees),
    true
  )
  assert.equal(
    Object.isFrozen(result.organization.employees[0]),
    true
  )
})

test("EmployeeExecutor rejects a reference to an unknown position", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      employeeChangeSet("change-1", 1, "employee.create", {
        employeeId: "employee-1",
        positionId: "position-404",
      }),
    ],
  })

  assert.equal(result.isValid, false)
  assert.equal(
    result.errors[0]?.code,
    "employee.create.position_not_found"
  )
  assert.deepEqual(result.organization.employees, [])
})

test("EmployeeExecutor does not run an employee change set from another company", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      employeeChangeSet(
        "change-1",
        1,
        "employee.create",
        { employeeId: "employee-1", positionId: null },
        { companyId: "company-2" }
      ),
    ],
  })

  assert.equal(result.isValid, false)
  assert.equal(
    result.errors.some(
      (error) => error.code === "change_set_scope_mismatch"
    ),
    true
  )
  assert.deepEqual(result.organization.employees, [])
})

test("EmployeeExecutor does not run an employee change set from another scenario", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      employeeChangeSet(
        "change-1",
        1,
        "employee.create",
        { employeeId: "employee-1", positionId: null },
        { scenarioId: "scenario-2" }
      ),
    ],
  })

  assert.equal(result.isValid, false)
  assert.equal(
    result.errors.some(
      (error) => error.code === "change_set_scope_mismatch"
    ),
    true
  )
  assert.deepEqual(result.organization.employees, [])
})

test("EmployeeExecutor reports employee.terminate as unsupported (deferred)", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      employeeChangeSet("change-1", 1, "employee.terminate", {
        employeeId: "employee-1",
      }),
    ],
  })

  assert.equal(result.isValid, false)
  assert.equal(
    result.errors[0]?.code,
    "employee.change_set.unsupported"
  )
})
