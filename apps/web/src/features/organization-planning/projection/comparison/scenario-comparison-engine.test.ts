import assert from "node:assert/strict"
import test from "node:test"

import { createEmptyProjectedOrganization, freezeProjectedOrganization, type ProjectedOrganization, type ProjectionSnapshot } from "../contracts"
import { StructuralProjectionMetricsCalculator } from "../state"
import { mapProjectionSnapshotRow } from "../../repositories/snapshot-record"
import { ScenarioComparisonEngine } from "./scenario-comparison-engine"
import { ScenarioComparisonError } from "./comparison-error"

const engine = ScenarioComparisonEngine.create()

function organization(overrides: Partial<ProjectedOrganization> = {}) {
  return freezeProjectedOrganization({ ...createEmptyProjectedOrganization(), ...overrides })
}
function organizationWithCalculatedMetrics(overrides: Partial<ProjectedOrganization> = {}) {
  const value = organization(overrides)
  return freezeProjectedOrganization({
    ...value,
    metrics: new StructuralProjectionMetricsCalculator().calculate(value),
  })
}
function department(id: string, overrides = {}) {
  return { id, name: id, code: null, description: null, parentDepartmentId: null, status: "active" as const, ...overrides }
}
function team(id: string, overrides = {}) {
  return { id, name: id, code: null, description: null, departmentId: null, status: "active" as const, ...overrides }
}
function position(id: string, overrides = {}) {
  return { id, name: id, description: null, departmentId: null, hierarchicalLevel: "analyst" as const, weeklyWorkloadHours: 40, workModel: "hybrid" as const, employmentType: "clt" as const, travelRequirement: "none" as const, status: "active" as const, ...overrides }
}
function snapshot(organizationValue: ProjectedOrganization, companyId = "company-1", workspaceId = "workspace-1"): ProjectionSnapshot {
  return Object.freeze({ id: `snapshot-${companyId}-${workspaceId}`, companyId, workspaceId, sourceScenarioId: null, version: 1, publishedAt: new Date("2026-01-01T00:00:00.000Z"), kind: "baseline", organization: organizationValue })
}

test("compares every projected entity and metric by id", () => {
  const before = organization({
    departments: [department("department-archive"), department("department-update")],
    teams: [team("team-update")],
    positions: [position("position-update")],
    employees: [
      { id: "employee-transfer", positionId: "position-1", departmentId: "department-1", teamId: "team-1", status: "active" },
      { id: "employee-terminate", positionId: null, status: "active" },
    ],
    vacancies: [{ id: "vacancy-close", positionId: null, status: "active" }],
    metrics: { headcount: 2, vacancies: 1, salaryMass: 0, departments: 2, positions: 1 },
  })
  const after = organization({
    departments: [department("department-created"), department("department-archive", { status: "archived" as const }), department("department-update", { name: "Atualizado" })],
    teams: [team("team-created"), team("team-update", { departmentId: "department-update" })],
    positions: [position("position-created"), position("position-update", { name: "Atualizado" })],
    employees: [
      { id: "employee-created", positionId: null, status: "active" },
      { id: "employee-transfer", positionId: "position-2", departmentId: "department-2", teamId: "team-2", status: "active" },
      { id: "employee-terminate", positionId: null, status: "archived" },
    ],
    vacancies: [
      { id: "vacancy-created", positionId: null, status: "active" },
      { id: "vacancy-close", positionId: null, status: "archived" },
    ],
    metrics: { headcount: 2, vacancies: 1, salaryMass: 0, departments: 3, positions: 2 },
  })

  const result = engine.compare({ before, after })
  assert.deepEqual(result.departments.created.map((item) => item.entity.id), ["department-created"])
  assert.deepEqual(result.departments.updated[0]?.changedFields, ["name"])
  assert.deepEqual(result.departments.archived.map((item) => item.after.id), ["department-archive"])
  assert.equal(result.teams.created.length, 1)
  assert.equal(result.teams.updated.length, 1)
  assert.equal(result.positions.created.length, 1)
  assert.equal(result.positions.updated.length, 1)
  assert.equal(result.employees.created.length, 1)
  assert.equal(result.employees.transferred.length, 1)
  assert.equal(result.employees.terminated.length, 1)
  assert.equal(result.vacancies.created.length, 1)
  assert.equal(result.vacancies.closed.length, 1)
  assert.deepEqual(result.metrics.departments, { before: 2, after: 3, delta: 1 })
  assert.equal(result.summary.totalChanges, 12)
})

test("returns an empty deterministic immutable comparison for equal inputs", () => {
  const input = organization({ departments: [department("department-b"), department("department-a")] })
  const original = structuredClone(input)
  const first = engine.compare({ before: input, after: input })
  const second = engine.compare({ before: input, after: input })
  assert.deepEqual(first, second)
  assert.equal(first.summary.totalChanges, 0)
  assert.deepEqual(input, original)
  assert.equal(Object.isFrozen(first), true)
  assert.equal(Object.isFrozen(first.departments.created), true)
})

test("orders differences by id independently of input order", () => {
  const result = engine.compare({
    before: organization(),
    after: organization({ departments: [department("z"), department("a"), department("m")] }),
  })
  assert.deepEqual(result.departments.created.map((item) => item.entity.id), ["a", "m", "z"])
})

test("validates Snapshot company, workspace, hydration and duplicate ids", () => {
  const empty = organization()
  assert.throws(() => engine.compare({ before: snapshot(empty, "company-1"), after: snapshot(empty, "company-2") }), (error) => error instanceof ScenarioComparisonError && error.code === "company_mismatch")
  assert.throws(() => engine.compare({ before: snapshot(empty, "company-1", "workspace-1"), after: snapshot(empty, "company-1", "workspace-2") }), (error) => error instanceof ScenarioComparisonError && error.code === "workspace_mismatch")
  const missing = { ...snapshot(empty), organization: undefined }
  assert.throws(() => engine.compare({ before: missing, after: snapshot(empty) }), (error) => error instanceof ScenarioComparisonError && error.code === "organization_missing")
  const duplicate = organization({ departments: [department("duplicate"), department("duplicate")] })
  assert.throws(() => engine.compare({ before: duplicate, after: empty }), (error) => error instanceof ScenarioComparisonError && error.code === "duplicate_entity_id")
})

test("indexes large organizations without changing deterministic output", () => {
  const departments = Array.from({ length: 5_000 }, (_, index) => department(`department-${String(index).padStart(5, "0")}`))
  const before = organization({ departments })
  const after = organization({ departments: [...departments, department("department-05000")] })
  const result = engine.compare({ before, after })
  assert.deepEqual(result.departments.created.map((item) => item.entity.id), ["department-05000"])
  assert.equal(result.summary.totalChanges, 1)
})

test("classifies active Vacancy lifecycle without overlapping closed and removed", () => {
  const before = organizationWithCalculatedMetrics({
    vacancies: [
      { id: "vacancy-update", positionId: "position-1", departmentId: "department-1", teamId: null, status: "active" },
      { id: "vacancy-close", positionId: null, status: "active" },
      { id: "vacancy-remove", positionId: null, status: "active" },
    ],
  })
  const after = organizationWithCalculatedMetrics({
    vacancies: [
      { id: "vacancy-created", positionId: null, status: "active" },
      { id: "vacancy-close", positionId: null, status: "archived" },
      { id: "vacancy-update", positionId: "position-2", departmentId: "department-2", teamId: "team-2", status: "active" },
    ],
  })

  const result = engine.compare({ before, after })
  assert.deepEqual(result.vacancies.created.map((item) => item.entity.id), ["vacancy-created"])
  assert.deepEqual(result.vacancies.updated.map((item) => item.after.id), ["vacancy-update"])
  assert.deepEqual(result.vacancies.updated[0]?.changedFields, ["positionId", "departmentId", "teamId"])
  assert.deepEqual(result.vacancies.closed.map((item) => item.after.id), ["vacancy-close"])
  assert.deepEqual(result.vacancies.removed.map((item) => item.entity.id), ["vacancy-remove"])
  assert.equal(result.vacancies.removed.some((item) => item.entity.id === "vacancy-close"), false)
  assert.deepEqual(result.metrics.vacancies, { before: 3, after: 2, delta: -1 })
})

test("compares Baseline and persisted Projection Vacancies after reconstruction", () => {
  const baselineOrganization = organizationWithCalculatedMetrics({ vacancies: [] })
  const projectedOrganization = organizationWithCalculatedMetrics({
    vacancies: [
      { id: "vacancy-b", positionId: null, status: "archived" },
      { id: "vacancy-a", positionId: null, status: "active" },
    ],
  })
  const persisted = mapProjectionSnapshotRow({
    id: "snapshot-2",
    company_id: "company-1",
    workspace_id: "workspace-1",
    source_scenario_id: "scenario-1",
    version: 2,
    published_at: "2026-01-02T00:00:00.000Z",
    kind: "projection",
    organization: structuredClone(projectedOrganization),
  })
  const original = structuredClone(projectedOrganization)

  const first = engine.compare({
    before: snapshot(baselineOrganization),
    after: persisted,
  })
  const second = engine.compare({
    before: snapshot(baselineOrganization),
    after: persisted,
  })

  assert.deepEqual(first, second)
  assert.deepEqual(first.vacancies.created.map((item) => item.entity.id), ["vacancy-a", "vacancy-b"])
  assert.equal(first.vacancies.closed.length, 0)
  assert.deepEqual(first.metrics.vacancies, { before: 0, after: 1, delta: 1 })
  assert.deepEqual(projectedOrganization, original)
  assert.equal(Object.isFrozen(persisted.organization?.vacancies), true)
})
