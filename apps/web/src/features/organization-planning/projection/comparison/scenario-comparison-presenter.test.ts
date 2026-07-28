import assert from "node:assert/strict"
import test from "node:test"
import type {
  ProjectedOrganization,
  ProjectionMetrics,
} from "../contracts"
import { ScenarioComparisonPresenter } from "./presenters"
import { ScenarioComparisonEngine } from "./scenario-comparison-engine"

function metrics(
  overrides: Partial<ProjectionMetrics> = {}
): ProjectionMetrics {
  return {
    headcount: 1,
    vacancies: 0,
    salaryMass: 5000,
    departments: 1,
    positions: 1,
    ...overrides,
  }
}

function organization(
  overrides: Partial<ProjectedOrganization> = {}
): ProjectedOrganization {
  return {
    departments: [],
    teams: [],
    positions: [],
    employees: [],
    vacancies: [],
    metrics: metrics(),
    ...overrides,
  }
}

test("ScenarioComparisonPresenter maps the engine result to a detached view model", () => {
  const result = ScenarioComparisonEngine.create().compare({
    baseOrganization: organization({
      departments: [{
        id: "department-1",
        name: "Operações",
        code: "OPS",
        description: null,
        parentDepartmentId: null,
        status: "active",
      }],
      employees: [{ id: "employee-1", positionId: "position-1" }],
    }),
    projectedOrganization: organization({
      departments: [{
        id: "department-1",
        name: "Operações Globais",
        code: "OPS",
        description: null,
        parentDepartmentId: null,
        status: "active",
      }],
      teams: [{
        id: "team-1",
        name: "Plataforma",
        code: "PLAT",
        description: null,
        departmentId: "department-1",
        status: "active",
      }],
      positions: [{
        id: "position-2",
        name: "Especialista",
        description: null,
        departmentId: "department-1",
        hierarchicalLevel: "specialist",
        weeklyWorkloadHours: 40,
        workModel: "hybrid",
        employmentType: "clt",
        travelRequirement: "none",
        status: "active",
      }],
      employees: [{ id: "employee-1", positionId: "position-2" }],
      metrics: metrics({ vacancies: 1, positions: 2 }),
    }),
  })

  const viewModel = ScenarioComparisonPresenter.present(result)

  assert.deepEqual(viewModel.departments.updated[0], {
    before: {
      id: "department-1",
      name: "Operações",
      code: "OPS",
      description: null,
      parentDepartmentId: null,
      status: "active",
    },
    after: {
      id: "department-1",
      name: "Operações Globais",
      code: "OPS",
      description: null,
      parentDepartmentId: null,
      status: "active",
    },
    changedFields: ["name"],
  })
  assert.equal(viewModel.teams.created[0]?.entity.id, "team-1")
  assert.equal(viewModel.positions.created[0]?.entity.id, "position-2")
  assert.deepEqual(viewModel.employees.moved[0], {
    employee: { id: "employee-1", positionId: "position-2" },
    previousPositionId: "position-1",
    positionId: "position-2",
  })
  assert.deepEqual(viewModel.summary.metrics.vacancies, {
    before: 0,
    after: 1,
    delta: 1,
  })
  assert.equal("salaryMass" in viewModel.summary.metrics, false)
  assert.notEqual(viewModel.summary, result.summary)
  assert.notEqual(
    viewModel.departments.updated[0]?.after,
    result.departments.updated[0]?.after
  )
  assert.notEqual(
    viewModel.departments.updated[0]?.changedFields,
    result.departments.updated[0]?.changedFields
  )
})

test("ScenarioComparisonPresenter returns a new serializable view model on each call", () => {
  const result = ScenarioComparisonEngine.create().compare({
    baseOrganization: organization(),
    projectedOrganization: organization(),
  })

  const first = ScenarioComparisonPresenter.present(result)
  const second = ScenarioComparisonPresenter.present(result)

  assert.deepEqual(first, second)
  assert.notEqual(first, second)
  assert.doesNotThrow(() => JSON.stringify(first))
})
