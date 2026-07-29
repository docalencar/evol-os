import assert from "node:assert/strict"
import test from "node:test"

import {
  createEmptyProjectedOrganization,
  freezeProjectedOrganization,
  type ProjectedEmployee,
  type ProjectedOrganization,
} from "../../projection/contracts"
import { ScenarioComparisonEngine, type ScenarioComparisonResult } from "../../projection/comparison"
import { PlanningInsightsEngine } from "./planning-insights-engine"

const comparisonEngine = ScenarioComparisonEngine.create()
const insightsEngine = PlanningInsightsEngine.create()

test("returns an immutable empty analysis when the comparison has no changes", () => {
  const comparison = compare(organization(), organization())
  const insights = insightsEngine.analyze(comparison)

  assert.deepEqual(insights.summary, {
    totalChanges: 0,
    entitiesAffected: 0,
    organizationalGrowth: 0,
    organizationalReduction: 0,
    riskLevel: "low",
  })
  assert.deepEqual(insights.warnings, [])
  assert.deepEqual(insights.opportunities, [])
  assert.deepEqual(insights.recommendations, [])
  assert.equal(Object.isFrozen(insights), true)
  assert.equal(Object.isFrozen(insights.warnings), true)
})

test("maps a small comparison to KPIs without producing unsupported warnings", () => {
  const comparison = compare(
    organization({ metrics: metrics({ headcount: 2 }) }),
    organization({
      departments: [department("department-new")],
      employees: [employee("employee-1"), employee("employee-2"), employee("employee-3")],
      metrics: metrics({ headcount: 3, departments: 1 }),
    })
  )
  const insights = insightsEngine.analyze(comparison)

  assert.equal(insights.kpis.headcountDelta, 1)
  assert.equal(insights.kpis.departmentsCreated, 1)
  assert.equal(insights.summary.organizationalGrowth, 1)
  assert.deepEqual(insights.warnings, [])
  assert.deepEqual(insights.opportunities.map((item) => item.id), ["workforce_growth"])
})

test("detects deterministic workforce, mobility and structural risks", () => {
  const beforeEmployees = Array.from({ length: 20 }, (_, index) => employee(`employee-${index}`))
  const afterEmployees: ProjectedEmployee[] = [
    ...beforeEmployees.slice(0, 6).map((value) => ({ ...value, status: "archived" as const })),
    ...beforeEmployees.slice(6, 10).map((value) => ({ ...value, departmentId: "department-new" })),
    ...beforeEmployees.slice(10),
  ]
  const before = organization({
    departments: [department("department-removed")],
    employees: beforeEmployees,
    metrics: metrics({ headcount: 20, departments: 1 }),
  })
  const after = organization({
    departments: [
      department("department-removed", "archived"),
      ...Array.from({ length: 10 }, (_, index) => department(`department-${index}`)),
    ],
    employees: afterEmployees,
    metrics: metrics({ headcount: 14, departments: 10 }),
  })
  const comparison = compare(before, after)
  const first = insightsEngine.analyze(comparison)
  const second = insightsEngine.analyze(comparison)

  assert.deepEqual(first, second)
  assert.deepEqual(first.warnings.map((warning) => warning.id), [
    "headcount_reduction",
    "high_terminations",
    "high_transfers",
    "excessive_structural_changes",
    "departments_removed",
  ])
  assert.equal(first.summary.riskLevel, "critical")
  assert.equal(first.summary.organizationalReduction, 6)
  assert.deepEqual(first.riskIndicators.map((indicator) => indicator.value), [30, 30, 20, 11])
  assert.deepEqual(first.recommendations.map((item) => item.id), [
    "validate_succession_plan",
    "review_managerial_capacity",
    "review_operational_impact",
    "plan_change_communication",
  ])
})

test("reports growth and elevated transfers without changing the comparison", () => {
  const before = organization({
    employees: Array.from({ length: 5 }, (_, index) => employee(`employee-${index}`)),
    metrics: metrics({ headcount: 5 }),
  })
  const after = organization({
    teams: [{ id: "team-new", name: "Novo", code: null, description: null, departmentId: null, status: "active" }],
    positions: [{
      id: "position-new",
      name: "Novo",
      description: null,
      departmentId: null,
      hierarchicalLevel: "analyst",
      weeklyWorkloadHours: 40,
      workModel: "hybrid",
      employmentType: "clt",
      travelRequirement: "none",
      status: "active",
    }],
    employees: [
      { ...employee("employee-0"), teamId: "team-new" },
      ...Array.from({ length: 5 }, (_, index) => employee(`employee-${index + 1}`)),
    ],
    metrics: metrics({ headcount: 6, positions: 1 }),
  })
  const comparison = compare(before, after)
  const original = structuredClone(comparison)
  const insights = insightsEngine.analyze(comparison)

  assert.equal(insights.kpis.employeesTransferred, 1)
  assert.deepEqual(insights.warnings.map((warning) => warning.id), ["high_transfers"])
  assert.deepEqual(insights.opportunities.map((item) => item.id), [
    "workforce_growth",
    "new_organizational_capacity",
  ])
  assert.deepEqual(comparison, original)
})

test("uses only ScenarioComparisonResult metrics and classifications", () => {
  const comparison = compare(
    organization({ vacancies: [{ id: "vacancy-1", positionId: null, status: "active" }], metrics: metrics({ vacancies: 1 }) }),
    organization({ vacancies: [{ id: "vacancy-1", positionId: null, status: "archived" }], metrics: metrics() })
  )
  const insights = insightsEngine.analyze(comparison)

  assert.equal(insights.kpis.vacanciesDelta, -1)
  assert.equal(insights.kpis.vacanciesClosed, 1)
  assert.equal(insights.organizationalImpact.vacancyChanges, 1)
})

test("handles an initial headcount of zero without invalid percentages", () => {
  const comparison = compare(
    organization({
      employees: [employee("employee-terminated")],
      metrics: metrics({ headcount: 0 }),
    }),
    organization({
      employees: [{ ...employee("employee-terminated"), status: "archived" }],
      metrics: metrics({ headcount: 0 }),
    })
  )
  const insights = insightsEngine.analyze(comparison)

  assert.equal(insights.kpis.employeesTerminated, 1)
  assert.equal(insights.warnings.some((warning) => warning.id === "high_terminations"), false)
  assert.equal(insights.riskIndicators.some((indicator) => !Number.isFinite(indicator.value)), false)
})

test("reports deterministic growth when the initial headcount is zero", () => {
  const comparison = compare(
    organization({ metrics: metrics({ headcount: 0 }) }),
    organization({
      employees: [employee("employee-created")],
      metrics: metrics({ headcount: 1 }),
    })
  )
  const insights = insightsEngine.analyze(comparison)

  assert.equal(insights.kpis.headcountDelta, 1)
  assert.equal(insights.summary.organizationalGrowth, 1)
  assert.equal(insights.summary.organizationalReduction, 0)
  assert.deepEqual(insights.opportunities.map((opportunity) => opportunity.id), ["workforce_growth"])
  assert.deepEqual(insights.warnings, [])
  assert.deepEqual(insights.riskIndicators, [])
})

test("preserves the official archived, terminated and closed semantics separately from removed", () => {
  const before = organization({
    departments: [department("department-archived"), department("department-removed")],
    employees: [
      employee("employee-terminated"),
      employee("employee-removed"),
      employee("employee-transferred"),
    ],
    vacancies: [
      { id: "vacancy-closed", positionId: null, status: "active" },
      { id: "vacancy-removed", positionId: null, status: "active" },
    ],
    metrics: metrics({ headcount: 3, vacancies: 2, departments: 2 }),
  })
  const after = organization({
    departments: [department("department-archived", "archived")],
    employees: [
      { ...employee("employee-terminated"), status: "archived" },
      { ...employee("employee-transferred"), departmentId: "department-new" },
    ],
    vacancies: [{ id: "vacancy-closed", positionId: null, status: "archived" }],
    metrics: metrics({ headcount: 1, vacancies: 0, departments: 0 }),
  })
  const comparison = compare(before, after)
  const insights = insightsEngine.analyze(comparison)

  assert.equal(comparison.summary.departments.archived, 1)
  assert.equal(comparison.summary.departments.removed, 1)
  assert.equal(insights.kpis.departmentsArchived, 1)
  assert.equal(insights.organizationalImpact.departmentsRemoved, 2)

  assert.equal(comparison.summary.employees.terminated, 1)
  assert.equal(comparison.summary.employees.transferred, 1)
  assert.equal(comparison.summary.employees.removed, 1)
  assert.equal(insights.kpis.employeesTerminated, 1)
  assert.equal(insights.kpis.employeesTransferred, 1)

  assert.equal(comparison.summary.vacancies.closed, 1)
  assert.equal(comparison.summary.vacancies.removed, 1)
  assert.equal(insights.kpis.vacanciesClosed, 1)
  assert.equal(insights.organizationalImpact.vacancyChanges, 2)
})

test("keeps rule IDs unique, stable and deterministically ordered", () => {
  const beforeEmployees = Array.from({ length: 20 }, (_, index) => employee(`employee-${index}`))
  const afterEmployees = [
    ...beforeEmployees.slice(0, 6).map((value) => ({ ...value, status: "archived" as const })),
    ...beforeEmployees.slice(6, 10).map((value) => ({ ...value, teamId: "team-new" })),
    ...beforeEmployees.slice(10),
  ]
  const comparison = compare(
    organization({
      departments: [department("department-removed")],
      employees: beforeEmployees,
      metrics: metrics({ headcount: 20, departments: 1 }),
    }),
    organization({
      departments: [
        department("department-removed", "archived"),
        ...Array.from({ length: 10 }, (_, index) => department(`department-${index}`)),
      ],
      teams: [{ id: "team-new", name: "Novo", code: null, description: null, departmentId: null, status: "active" }],
      employees: afterEmployees,
      metrics: metrics({ headcount: 14, departments: 10 }),
    })
  )
  const first = insightsEngine.analyze(comparison)
  const second = insightsEngine.analyze(comparison)

  assert.deepEqual(ids(first.warnings), [
    "headcount_reduction",
    "high_terminations",
    "high_transfers",
    "excessive_structural_changes",
    "departments_removed",
  ])
  assert.deepEqual(ids(first.riskIndicators), [
    "headcount_reduction",
    "high_terminations",
    "high_transfers",
    "excessive_structural_changes",
  ])
  assert.deepEqual(ids(first.recommendations), [
    "validate_succession_plan",
    "review_managerial_capacity",
    "review_operational_impact",
    "plan_change_communication",
  ])
  assert.deepEqual(ids(first.opportunities), ["new_organizational_capacity"])
  assertUniqueIds(first.warnings)
  assertUniqueIds(first.riskIndicators)
  assertUniqueIds(first.recommendations)
  assertUniqueIds(first.opportunities)
  assert.deepEqual(first, second)
})

test("accepts a frozen comparison and returns a deeply frozen result", () => {
  const comparison = compare(
    organization({ metrics: metrics({ headcount: 1 }) }),
    organization({
      departments: [department("department-new")],
      employees: [employee("employee-1"), employee("employee-2")],
      metrics: metrics({ headcount: 2, departments: 1 }),
    })
  )

  assertDeepFrozen(comparison)
  const original = structuredClone(comparison)
  const insights = insightsEngine.analyze(comparison)

  assertDeepFrozen(insights)
  assert.deepEqual(comparison, original)
})

function compare(before: ProjectedOrganization, after: ProjectedOrganization): ScenarioComparisonResult {
  return comparisonEngine.compare({ before, after })
}

function organization(overrides: Partial<ProjectedOrganization> = {}): ProjectedOrganization {
  return freezeProjectedOrganization({ ...createEmptyProjectedOrganization(), ...overrides })
}

function metrics(overrides: Partial<ProjectedOrganization["metrics"]> = {}): ProjectedOrganization["metrics"] {
  return { headcount: 0, vacancies: 0, salaryMass: 0, departments: 0, positions: 0, ...overrides }
}

function department(id: string, status: "active" | "archived" = "active") {
  return { id, name: id, code: null, description: null, parentDepartmentId: null, status }
}

function employee(id: string): ProjectedEmployee {
  return { id, positionId: null, departmentId: null, teamId: null, status: "active" }
}

function ids(values: readonly Readonly<{ id: string }>[]): string[] {
  return values.map((value) => value.id)
}

function assertUniqueIds(values: readonly Readonly<{ id: string }>[]): void {
  assert.equal(new Set(ids(values)).size, values.length)
}

function assertDeepFrozen(value: unknown, visited = new Set<object>()): void {
  if (typeof value !== "object" || value === null || visited.has(value)) return
  visited.add(value)
  assert.equal(Object.isFrozen(value), true)
  for (const nested of Object.values(value)) assertDeepFrozen(nested, visited)
}
