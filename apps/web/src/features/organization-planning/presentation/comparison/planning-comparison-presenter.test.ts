import assert from "node:assert/strict"
import test from "node:test"

import {
  createEmptyProjectedOrganization,
  freezeProjectedOrganization,
  type ProjectedOrganization,
} from "../../projection/contracts"
import { ScenarioComparisonEngine } from "../../projection/comparison"
import { PlanningComparisonPresenter } from "./planning-comparison-presenter"

const comparisonEngine = ScenarioComparisonEngine.create()
const presenter = PlanningComparisonPresenter.create()

test("presents official comparison classifications without exposing domain objects", () => {
  const comparison = comparisonEngine.compare({
    before: organization({
      departments: [department("department-archive", "Financeiro"), department("department-remove", "Legado")],
      employees: [employee("employee-transfer"), employee("employee-terminate"), employee("employee-remove")],
      vacancies: [vacancy("vacancy-close"), vacancy("vacancy-remove")],
      metrics: metrics({ headcount: 3, vacancies: 2, departments: 2 }),
    }),
    after: organization({
      departments: [department("department-archive", "Financeiro", "archived"), department("department-create", "Produto")],
      employees: [
        { ...employee("employee-transfer"), departmentId: "department-create" },
        { ...employee("employee-terminate"), status: "archived" },
      ],
      vacancies: [{ ...vacancy("vacancy-close"), status: "archived" }],
      metrics: metrics({ headcount: 1, vacancies: 0, departments: 1 }),
    }),
  })
  const original = structuredClone(comparison)
  const viewModel = presenter.present(comparison)
  const departmentChanges = viewModel.sections.find((section) => section.id === "departments")?.changes ?? []
  const employeeChanges = viewModel.sections.find((section) => section.id === "employees")?.changes ?? []
  const vacancyChanges = viewModel.sections.find((section) => section.id === "vacancies")?.changes ?? []

  assert.deepEqual(departmentChanges.map((change) => change.changeType), ["created", "archived", "removed"])
  assert.deepEqual(employeeChanges.map((change) => change.changeType), ["transferred", "terminated", "removed"])
  assert.deepEqual(vacancyChanges.map((change) => change.changeType), ["closed", "removed"])
  assert.equal(employeeChanges[0]?.changedFields[0], "Alocação organizacional")
  assert.notEqual(departmentChanges[0], comparison.departments.created[0])
  assert.deepEqual(comparison, original)
  assertDeepFrozen(viewModel)
})

test("formats positive, negative and zero comparison metrics", () => {
  const comparison = comparisonEngine.compare({
    before: organization({ metrics: metrics({ headcount: 12, vacancies: 2, departments: 1, positions: 5 }) }),
    after: organization({ metrics: metrics({ headcount: 15, vacancies: 1, departments: 1, positions: 5 }) }),
  })
  const first = presenter.present(comparison)
  const second = presenter.present(comparison)

  assert.equal(first.metrics.find((metric) => metric.id === "headcount")?.deltaLabel, "+3 colaboradores")
  assert.equal(first.metrics.find((metric) => metric.id === "vacancies")?.deltaLabel, "-1 vaga")
  assert.equal(first.metrics.find((metric) => metric.id === "positions")?.deltaLabel, "0 cargos")
  assert.deepEqual(first, second)
})

test("presents an empty comparison explicitly", () => {
  const empty = organization()
  const viewModel = presenter.present(comparisonEngine.compare({ before: empty, after: empty }))

  assert.equal(viewModel.summary.isEmpty, true)
  assert.equal(viewModel.summary.totalChangesLabel, "0 alterações")
  assert.equal(viewModel.sections.every((section) => section.isEmpty), true)
})

function organization(overrides: Partial<ProjectedOrganization> = {}): ProjectedOrganization {
  return freezeProjectedOrganization({ ...createEmptyProjectedOrganization(), ...overrides })
}

function metrics(overrides: Partial<ProjectedOrganization["metrics"]> = {}): ProjectedOrganization["metrics"] {
  return { headcount: 0, vacancies: 0, salaryMass: 0, departments: 0, positions: 0, ...overrides }
}

function department(id: string, name: string, status: "active" | "archived" = "active") {
  return { id, name, code: null, description: null, parentDepartmentId: null, status }
}

function employee(id: string) {
  return { id, positionId: null, departmentId: null, teamId: null, status: "active" as const }
}

function vacancy(id: string) {
  return { id, positionId: null, departmentId: null, teamId: null, status: "active" as const }
}

function assertDeepFrozen(value: unknown, visited = new Set<object>()): void {
  if (typeof value !== "object" || value === null || visited.has(value)) return
  visited.add(value)
  assert.equal(Object.isFrozen(value), true)
  for (const nested of Object.values(value)) assertDeepFrozen(nested, visited)
}
