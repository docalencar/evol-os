import assert from "node:assert/strict"
import test from "node:test"
import type {
  ChangeSet,
  PlanningScenarioContract,
  PublishedSnapshotContract,
} from "../../types/planning-contracts"
import type {
  ProjectedEmployee,
  ProjectedPosition,
} from "../contracts"
import { ProjectionEngine } from "../engine"
import { archiveProjectedPosition } from "./projected-position-operations"

function position(
  overrides: Partial<ProjectedPosition> = {}
): ProjectedPosition {
  return Object.freeze({
    id: "position-1",
    name: "Analista financeiro",
    description: null,
    departmentId: "department-1",
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
  overrides: Partial<ProjectedEmployee> = {}
): ProjectedEmployee {
  return Object.freeze({
    id: "employee-1",
    positionId: "position-1",
    ...overrides,
  })
}

test("archiveProjectedPosition rejects archiving a position still referenced by an employee", () => {
  const positions = Object.freeze([position()])
  const employees = Object.freeze([employee()])

  const result = archiveProjectedPosition(
    positions,
    employees,
    "change-1",
    { positionId: "position-1" }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "position.archive.has_active_employees"
  )
  // Nenhuma coleção é alterada em caso de falha.
  assert.equal(positions[0]?.status, "active")
  assert.equal(employees[0]?.positionId, "position-1")
})

test("archiveProjectedPosition allows archiving a position with no employees referencing it", () => {
  const result = archiveProjectedPosition(
    [position()],
    [employee({ positionId: "position-2" })],
    "change-1",
    { positionId: "position-1" }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.positions[0]?.status, "archived")
})

test("archiveProjectedPosition is deterministic for equivalent inputs", () => {
  const first = archiveProjectedPosition(
    [position()],
    [],
    "change-1",
    { positionId: "position-1" }
  )
  const second = archiveProjectedPosition(
    [position()],
    [],
    "change-1",
    { positionId: "position-1" }
  )

  assert.deepEqual(first, second)
})

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

function changeSet(
  id: string,
  version: number,
  changeType: string,
  payload: Readonly<Record<string, unknown>>
): ChangeSet {
  return Object.freeze({
    id,
    companyId: "company-1",
    scenarioId: "scenario-1",
    changeType,
    payload: Object.freeze({ ...payload }),
    version,
  })
}

function referencedPositionProjection() {
  return {
    snapshot,
    scenario,
    changeSets: [
      changeSet("change-1", 1, "position.create", {
        positionId: "position-1",
        name: "Analista financeiro",
        description: null,
        departmentId: null,
        hierarchicalLevel: "analyst",
        weeklyWorkloadHours: 40,
        workModel: "hybrid",
        employmentType: "clt",
        travelRequirement: "none",
      }),
      changeSet("change-2", 2, "employee.create", {
        employeeId: "employee-1",
        positionId: "position-1",
      }),
      changeSet("change-3", 3, "position.archive", {
        positionId: "position-1",
      }),
    ],
  }
}

test("ProjectionEngine blocks archiving a position referenced by an employee", () => {
  const snapshotBefore = { ...snapshot }

  const result = ProjectionEngine.create().project(
    referencedPositionProjection()
  )

  assert.equal(result.isValid, false)
  assert.equal(
    result.errors.some(
      (error) =>
        error.code === "position.archive.has_active_employees"
    ),
    true
  )
  // O cargo permanece ativo.
  assert.equal(
    result.organization.positions[0]?.status,
    "active"
  )
  // O colaborador permanece inalterado.
  assert.deepEqual(result.organization.employees, [
    { id: "employee-1", positionId: "position-1" },
  ])
  // As demais coleções permanecem inalteradas.
  assert.deepEqual(result.organization.departments, [])
  assert.deepEqual(result.organization.teams, [])
  assert.deepEqual(result.organization.vacancies, [])
  // O snapshot de entrada não é mutado.
  assert.deepEqual({ ...snapshot }, snapshotBefore)
})

test("ProjectionEngine is deterministic when blocking the archive", () => {
  const engine = ProjectionEngine.create()

  assert.deepEqual(
    engine.project(referencedPositionProjection()),
    engine.project(referencedPositionProjection())
  )
})
