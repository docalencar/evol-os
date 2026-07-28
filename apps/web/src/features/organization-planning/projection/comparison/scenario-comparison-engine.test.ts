import assert from "node:assert/strict"
import test from "node:test"
import type {
  ProjectedDepartment,
  ProjectedEmployee,
  ProjectedOrganization,
  ProjectedPosition,
  ProjectedTeam,
  ProjectionMetrics,
} from "../contracts"
import { ScenarioComparisonEngine } from "./scenario-comparison-engine"

function department(
  id: string,
  overrides: Partial<ProjectedDepartment> = {}
): ProjectedDepartment {
  return Object.freeze({
    id,
    name: `Departamento ${id}`,
    code: id.toUpperCase(),
    description: null,
    parentDepartmentId: null,
    status: "active",
    ...overrides,
  })
}

function team(
  id: string,
  overrides: Partial<ProjectedTeam> = {}
): ProjectedTeam {
  return Object.freeze({
    id,
    name: `Time ${id}`,
    code: id.toUpperCase(),
    description: null,
    departmentId: null,
    status: "active",
    ...overrides,
  })
}

function position(
  id: string,
  overrides: Partial<ProjectedPosition> = {}
): ProjectedPosition {
  return Object.freeze({
    id,
    name: `Cargo ${id}`,
    description: null,
    departmentId: null,
    hierarchicalLevel: "analyst",
    weeklyWorkloadHours: 40,
    workModel: "hybrid",
    employmentType: "clt",
    travelRequirement: "none",
    status: "active",
    ...overrides,
  })
}

function employee(
  id: string,
  positionId: string | null,
  overrides: Partial<ProjectedEmployee> = {}
): ProjectedEmployee {
  return Object.freeze({
    id,
    fullName: `Colaborador ${id}`,
    email: null,
    status: "active",
    managerId: null,
    departmentId: null,
    teamId: null,
    positionId,
    ...overrides,
  })
}

function metrics(
  overrides: Partial<ProjectionMetrics> = {}
): ProjectionMetrics {
  return Object.freeze({
    headcount: 0,
    vacancies: 0,
    salaryMass: 0,
    departments: 0,
    positions: 0,
    ...overrides,
  })
}

function organization(
  overrides: Partial<ProjectedOrganization> = {}
): ProjectedOrganization {
  return Object.freeze({
    departments: Object.freeze([]),
    teams: Object.freeze([]),
    positions: Object.freeze([]),
    employees: Object.freeze([]),
    vacancies: Object.freeze([]),
    metrics: metrics(),
    ...overrides,
  })
}

test("ScenarioComparisonEngine returns an immutable empty comparison for equal organizations", () => {
  const current = organization()
  const result = ScenarioComparisonEngine.create().compare({
    baseOrganization: current,
    projectedOrganization: current,
  })

  assert.deepEqual(result.departments, {
    created: [],
    updated: [],
    archived: [],
    removed: [],
  })
  assert.deepEqual(result.employees, {
    added: [],
    moved: [],
    removed: [],
  })
  assert.equal(result.summary.totalChanges, 0)
  assert.equal(result.summary.metrics.headcount.delta, 0)
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.summary), true)
  assert.equal(Object.isFrozen(result.departments.created), true)
})

test("ScenarioComparisonEngine compares departments, teams, positions and employees", () => {
  const baseOrganization = organization({
    departments: Object.freeze([
      department("department-removed"),
      department("department-updated"),
      department("department-archived"),
    ]),
    teams: Object.freeze([
      team("team-removed"),
      team("team-updated"),
      team("team-archived"),
    ]),
    positions: Object.freeze([
      position("position-removed"),
      position("position-updated"),
      position("position-archived"),
    ]),
    employees: Object.freeze([
      employee("employee-removed", "position-removed"),
      employee("employee-moved", "position-updated"),
    ]),
    metrics: metrics({
      headcount: 2,
      departments: 3,
      positions: 3,
    }),
  })
  const projectedOrganization = organization({
    departments: Object.freeze([
      department("department-created"),
      department("department-archived", { status: "archived" }),
      department("department-updated", { name: "Finanças" }),
    ]),
    teams: Object.freeze([
      team("team-created"),
      team("team-archived", { status: "archived" }),
      team("team-updated", { departmentId: "department-created" }),
    ]),
    positions: Object.freeze([
      position("position-created"),
      position("position-archived", { status: "archived" }),
      position("position-updated", { weeklyWorkloadHours: 36 }),
    ]),
    employees: Object.freeze([
      employee("employee-added", "position-created"),
      employee("employee-moved", "position-created"),
    ]),
    metrics: metrics({
      headcount: 2,
      vacancies: 1,
      departments: 3,
      positions: 3,
    }),
  })

  const result = ScenarioComparisonEngine.create().compare({
    baseOrganization,
    projectedOrganization,
  })

  assert.deepEqual(
    result.departments.created.map((change) => change.entity.id),
    ["department-created"]
  )
  assert.deepEqual(
    result.departments.updated[0]?.changedFields,
    ["name"]
  )
  assert.equal(
    result.departments.archived[0]?.after.id,
    "department-archived"
  )
  assert.equal(
    result.departments.removed[0]?.entity.id,
    "department-removed"
  )
  assert.deepEqual(
    result.teams.updated[0]?.changedFields,
    ["departmentId"]
  )
  assert.deepEqual(
    result.positions.updated[0]?.changedFields,
    ["weeklyWorkloadHours"]
  )
  assert.equal(result.employees.added[0]?.entity.id, "employee-added")
  assert.deepEqual(result.employees.moved[0], {
    before: employee("employee-moved", "position-updated"),
    after: employee("employee-moved", "position-created"),
    previousDepartmentId: null,
    departmentId: null,
    previousTeamId: null,
    teamId: null,
    previousPositionId: "position-updated",
    positionId: "position-created",
  })
  assert.equal(
    result.employees.removed[0]?.entity.id,
    "employee-removed"
  )
  assert.deepEqual(result.summary.departments, {
    created: 1,
    updated: 1,
    archived: 1,
    removed: 1,
    total: 4,
  })
  assert.deepEqual(result.summary.employees, {
    added: 1,
    moved: 1,
    removed: 1,
    total: 3,
  })
  assert.deepEqual(result.summary.metrics.vacancies, {
    before: 0,
    after: 1,
    delta: 1,
  })
  assert.equal("salaryMass" in result.summary.metrics, false)
  assert.equal(result.summary.totalChanges, 15)
})

test("ScenarioComparisonEngine recognizes department and team transfers that preserve the position", () => {
  const baseOrganization = organization({
    employees: Object.freeze([
      employee("employee-transferred", "position-1", {
        departmentId: "department-1",
        teamId: "team-1",
      }),
    ]),
  })
  const projectedOrganization = organization({
    employees: Object.freeze([
      employee("employee-transferred", "position-1", {
        departmentId: "department-2",
        teamId: "team-2",
      }),
    ]),
  })

  const result = ScenarioComparisonEngine.create().compare({
    baseOrganization,
    projectedOrganization,
  })

  assert.equal(result.employees.moved.length, 1)
  assert.deepEqual(result.employees.moved[0], {
    before: baseOrganization.employees[0],
    after: projectedOrganization.employees[0],
    previousDepartmentId: "department-1",
    departmentId: "department-2",
    previousTeamId: "team-1",
    teamId: "team-2",
    previousPositionId: "position-1",
    positionId: "position-1",
  })
  assert.equal(result.summary.employees.moved, 1)
  assert.equal(result.summary.totalChanges, 1)
})

test("ScenarioComparisonEngine recognizes a department-only transfer", () => {
  const baseOrganization = organization({
    employees: Object.freeze([
      employee("employee-transferred", "position-1", {
        departmentId: "department-1",
        teamId: "team-1",
      }),
    ]),
  })
  const projectedOrganization = organization({
    employees: Object.freeze([
      employee("employee-transferred", "position-1", {
        departmentId: "department-2",
        teamId: "team-1",
      }),
    ]),
  })

  const result = ScenarioComparisonEngine.create().compare({
    baseOrganization,
    projectedOrganization,
  })
  const move = result.employees.moved[0]

  assert.equal(result.employees.moved.length, 1)
  assert.equal(result.summary.employees.moved, 1)
  assert.equal(result.summary.totalChanges, 1)
  assert.equal(move?.previousDepartmentId, "department-1")
  assert.equal(move?.departmentId, "department-2")
  assert.equal(move?.previousTeamId, "team-1")
  assert.equal(move?.teamId, "team-1")
  assert.equal(move?.previousPositionId, "position-1")
  assert.equal(move?.positionId, "position-1")
})

test("ScenarioComparisonEngine recognizes a team-only transfer", () => {
  const baseOrganization = organization({
    employees: Object.freeze([
      employee("employee-transferred", "position-1", {
        departmentId: "department-1",
        teamId: "team-1",
      }),
    ]),
  })
  const projectedOrganization = organization({
    employees: Object.freeze([
      employee("employee-transferred", "position-1", {
        departmentId: "department-1",
        teamId: "team-2",
      }),
    ]),
  })

  const result = ScenarioComparisonEngine.create().compare({
    baseOrganization,
    projectedOrganization,
  })
  const move = result.employees.moved[0]

  assert.equal(result.employees.moved.length, 1)
  assert.equal(result.summary.employees.moved, 1)
  assert.equal(result.summary.totalChanges, 1)
  assert.equal(move?.previousDepartmentId, "department-1")
  assert.equal(move?.departmentId, "department-1")
  assert.equal(move?.previousTeamId, "team-1")
  assert.equal(move?.teamId, "team-2")
  assert.equal(move?.previousPositionId, "position-1")
  assert.equal(move?.positionId, "position-1")
})

test("ScenarioComparisonEngine is deterministic and preserves its inputs", () => {
  const baseDepartments = Object.freeze([
    department("department-z"),
    department("department-a"),
  ])
  const projectedDepartments = Object.freeze([
    department("department-new-z"),
    department("department-new-a"),
  ])
  const baseOrganization = organization({ departments: baseDepartments })
  const projectedOrganization = organization({
    departments: projectedDepartments,
  })
  const engine = ScenarioComparisonEngine.create()

  const first = engine.compare({
    baseOrganization,
    projectedOrganization,
  })
  const second = engine.compare({
    baseOrganization,
    projectedOrganization,
  })

  assert.deepEqual(first, second)
  assert.deepEqual(
    first.departments.created.map((change) => change.entity.id),
    ["department-new-a", "department-new-z"]
  )
  assert.deepEqual(
    first.departments.removed.map((change) => change.entity.id),
    ["department-a", "department-z"]
  )
  assert.deepEqual(baseOrganization.departments, baseDepartments)
  assert.deepEqual(projectedOrganization.departments, projectedDepartments)
  assert.throws(() => {
    ;(first.departments.created as unknown[]).push({})
  }, TypeError)
  assert.throws(() => {
    ;(first.departments.created[0]?.entity as { name: string }).name = "Mutado"
  }, TypeError)
})
