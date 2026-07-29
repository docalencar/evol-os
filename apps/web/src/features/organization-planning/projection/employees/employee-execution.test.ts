import assert from "node:assert/strict"
import test from "node:test"

import type { ChangeSet, PlanningScenarioContract } from "../../types/planning-contracts"
import { ProjectionEngine } from "../engine"
import type { ProjectedOrganization, ProjectionSnapshot } from "../contracts"

const scenario: PlanningScenarioContract = Object.freeze({
  id: "scenario-1", companyId: "company-1", workspaceId: "workspace-1",
  baseSnapshotId: "snapshot-1", name: "Cenário", description: null,
  status: "draft", version: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
})

function organization(overrides: Partial<ProjectedOrganization> = {}): ProjectedOrganization {
  return Object.freeze({
    departments: Object.freeze([
      Object.freeze({ id: "department-1", name: "Financeiro", code: null, description: null, parentDepartmentId: null, status: "active" as const }),
      Object.freeze({ id: "department-2", name: "Operações", code: null, description: null, parentDepartmentId: null, status: "active" as const }),
    ]),
    teams: Object.freeze([
      Object.freeze({ id: "team-1", name: "Contas", code: null, description: null, departmentId: "department-1", status: "active" as const }),
      Object.freeze({ id: "team-2", name: "Campo", code: null, description: null, departmentId: "department-2", status: "active" as const }),
    ]),
    positions: Object.freeze([
      Object.freeze({ id: "position-1", name: "Analista", description: null, departmentId: "department-1", hierarchicalLevel: "analyst" as const, weeklyWorkloadHours: 40, workModel: "hybrid" as const, employmentType: "clt" as const, travelRequirement: "none" as const, status: "active" as const }),
      Object.freeze({ id: "position-2", name: "Especialista", description: null, departmentId: "department-2", hierarchicalLevel: "specialist" as const, weeklyWorkloadHours: 40, workModel: "remote" as const, employmentType: "clt" as const, travelRequirement: "occasional" as const, status: "active" as const }),
    ]),
    employees: Object.freeze([]), vacancies: Object.freeze([]),
    metrics: Object.freeze({ headcount: 0, vacancies: 0, salaryMass: 0, departments: 2, positions: 2 }),
    ...overrides,
  })
}

function snapshot(base = organization()): ProjectionSnapshot {
  return Object.freeze({ id: "snapshot-1", companyId: "company-1", workspaceId: "workspace-1", sourceScenarioId: null, version: 1, publishedAt: new Date("2026-01-01T00:00:00.000Z"), organization: base })
}

function employeeChange(id: string, version: number, changeType: string, payload: Record<string, unknown>, companyId = "company-1"): ChangeSet {
  return Object.freeze({ id, version, changeType, companyId, scenarioId: "scenario-1", payload: Object.freeze({ ...payload }) })
}

test("executes create, update, transfer and terminate while recalculating headcount", () => {
  const result = ProjectionEngine.create().project({ snapshot: snapshot(), scenario, changeSets: [
    employeeChange("create", 1, "employee.create", { employeeId: "employee-1", positionId: "position-1", teamId: "team-1" }),
    employeeChange("update", 2, "employee.update", { employeeId: "employee-1", teamId: null }),
    employeeChange("transfer", 3, "employee.transfer", { employeeId: "employee-1", positionId: "position-2", departmentId: "department-2", teamId: "team-2" }),
    employeeChange("terminate", 4, "employee.terminate", { employeeId: "employee-1" }),
  ] })

  assert.equal(result.isValid, true)
  assert.deepEqual(result.organization.employees, [{ id: "employee-1", positionId: "position-2", departmentId: "department-2", teamId: "team-2", status: "archived" }])
  assert.equal(result.metrics.headcount, 0)
  assert.deepEqual(result.events.filter((event) => event.type === "change-set.executed").map((event) => event.changeSetId), ["create", "update", "transfer", "terminate"])
})

test("transfers between teams without changing position or department", () => {
  const base = organization({
    teams: Object.freeze([
      Object.freeze({ id: "team-1", name: "A", code: null, description: null, departmentId: "department-1", status: "active" as const }),
      Object.freeze({ id: "team-3", name: "B", code: null, description: null, departmentId: "department-1", status: "active" as const }),
    ]),
    employees: Object.freeze([{ id: "employee-1", positionId: "position-1", departmentId: "department-1", teamId: "team-1", status: "active" as const }]),
  })
  const result = ProjectionEngine.create().project({ snapshot: snapshot(base), scenario, changeSets: [employeeChange("transfer", 1, "employee.transfer", { employeeId: "employee-1", teamId: "team-3" })] })
  assert.deepEqual(result.organization.employees[0], { id: "employee-1", positionId: "position-1", departmentId: "department-1", teamId: "team-3", status: "active" })
})

test("rejects duplicate, missing employee and invalid structural references", () => {
  const active = Object.freeze([{ id: "employee-1", positionId: null, status: "active" as const }])
  const cases = [
    ["employee.create", { employeeId: "employee-1" }, "employee.create.id_already_exists"],
    ["employee.update", { employeeId: "missing", positionId: null }, "employee.update.not_found"],
    ["employee.transfer", { employeeId: "employee-1", positionId: "missing" }, "employee.transfer.position_not_found"],
    ["employee.transfer", { employeeId: "employee-1", departmentId: "missing" }, "employee.transfer.department_not_found"],
    ["employee.transfer", { employeeId: "employee-1", teamId: "missing" }, "employee.transfer.team_not_found"],
  ] as const
  for (const [changeType, payload, code] of cases) {
    const result = ProjectionEngine.create().project({ snapshot: snapshot(organization({ employees: active })), scenario, changeSets: [employeeChange("change", 1, changeType, payload)] })
    assert.equal(result.errors[0]?.code, code)
    assert.deepEqual(result.organization.employees, active)
  }
})

test("preserves snapshot immutability, ordering, determinism and company isolation", () => {
  const base = organization()
  const original = structuredClone(base)
  const firstPayload = { employeeId: "employee-1" }
  const changes = [
    employeeChange("second", 2, "employee.create", { employeeId: "employee-2" }),
    employeeChange("first", 1, "employee.create", firstPayload),
  ]
  const first = ProjectionEngine.create().project({ snapshot: snapshot(base), scenario, changeSets: changes })
  const second = ProjectionEngine.create().project({ snapshot: snapshot(base), scenario, changeSets: changes })
  assert.deepEqual(first.organization, second.organization)
  assert.deepEqual(first.organization.employees.map((employee) => employee.id), ["employee-1", "employee-2"])
  assert.deepEqual(base, original)
  assert.deepEqual(firstPayload, { employeeId: "employee-1" })
  assert.equal(Object.isFrozen(first.organization.employees[0]), true)

  const isolated = ProjectionEngine.create().project({ snapshot: snapshot(base), scenario, changeSets: [employeeChange("foreign", 1, "employee.create", { employeeId: "employee-3" }, "company-2")] })
  assert.equal(isolated.errors[0]?.code, "change_set_scope_mismatch")
  assert.deepEqual(isolated.organization.employees, [])
})

test("position archive is blocked only by active Employees", () => {
  const active = organization({ employees: Object.freeze([{
    id: "employee-1",
    positionId: "position-1",
    departmentId: "department-1",
    teamId: null,
    status: "active" as const,
  }]) })
  const archive = employeeChange(
    "archive-position",
    1,
    "position.archive",
    { positionId: "position-1" }
  )
  const blocked = ProjectionEngine.create().project({
    snapshot: snapshot(active), scenario, changeSets: [archive],
  })
  assert.equal(
    blocked.errors[0]?.code,
    "position.archive.has_active_employees"
  )

  const historical = organization({ employees: Object.freeze([{
    ...active.employees[0]!, status: "archived" as const,
  }]) })
  const allowed = ProjectionEngine.create().project({
    snapshot: snapshot(historical), scenario, changeSets: [archive],
  })
  assert.equal(allowed.isValid, true)
  assert.equal(allowed.organization.positions[0]?.status, "archived")
  assert.equal(allowed.organization.employees.length, 1)
})
