import assert from "node:assert/strict"
import test from "node:test"

import {
  InMemoryKPIEvaluationRepository, KPIEngine, KPIEvaluationApplicationService,
  KPIEvaluationService, KPICalculatorEngine, KPIRegistry,
} from "../../../kpi-engine"
import { ProjectionContext, type ProjectedOrganization } from "../../projection"
import {
  createPlanningKPIDefinitions, createPlanningKPIProviders,
  HeadcountProvider, mapProjectionContextToPlanningKPISource,
  OrganizationProvider, PayrollProvider, PlanningKPIService,
  ScenarioProvider, VacancyProvider, PLANNING_KPI_KEYS,
  type PlanningKPISource,
} from ".."

const instant = new Date("2026-01-01T00:00:00.000Z")

test("providers retornam zero para empresa vazia", () => {
  const source = createSource(emptyOrganization(), emptyOrganization())
  for (const provider of createPlanningKPIProviders()) {
    assert.equal(provider.calculate(source).every((item) => item.value === 0), true)
  }
})

test("HeadcountProvider distingue atual, aprovado e planejado", () => {
  const values = new HeadcountProvider().calculate(createSource(organization(1), organization(2)))
  assert.deepEqual(values.map((item) => item.value), [1, 2, 2])
})

test("VacancyProvider calcula vagas, ocupação e cargos únicos ocupados", () => {
  const values = new VacancyProvider().calculate(createSource(emptyOrganization(), organization(2)))
  assert.deepEqual(values.map((item) => item.value), [1, 2, 1])
})

test("PayrollProvider trata payroll zero e calcula variação", () => {
  const zero = new PayrollProvider().calculate(createSource(emptyOrganization(), organization(2)))
  assert.equal(zero[2]?.value, 0)
  const values = new PayrollProvider().calculate(createSource(organization(1, 100), organization(2, 125)))
  assert.equal(values[2]?.value, 0.25)
})

test("OrganizationProvider ignora arquivados e calcula layers e span", () => {
  const values = new OrganizationProvider().calculate(createSource(emptyOrganization(), organization(2)))
  assert.deepEqual(values.map((item) => item.value), [2, 1, 2, 2, 2])
})

test("ScenarioProvider cobre criação, arquivamento e cenário misto", () => {
  const source = createSource(emptyOrganization(), emptyOrganization(), [
    { type: "position.created", changeSetId: "c1", positionId: "p1" },
    { type: "position.archived", changeSetId: "c2", positionId: "p2" },
    { type: "team.created", changeSetId: "c3", teamId: "t1" },
    { type: "department.archived", changeSetId: "c4", departmentId: "d1" },
  ])
  const values = new ScenarioProvider().calculate(source)
  assert.equal(values.find((item) => item.key === PLANNING_KPI_KEYS.scenarioImpact)?.value, 0)
  assert.deepEqual(values.slice(1).map((item) => item.value), [1, 1, 1, 0, 0, 1])
})

test("mapper apenas captura estado base, projeção e cenário", () => {
  const current = organization(1)
  const planned = organization(2)
  const context = ProjectionContext.create(snapshot(current), scenario(), []).withOrganization(planned)
  const source = mapProjectionContextToPlanningKPISource(context)
  assert.equal(source.current.employees.length, 1)
  assert.equal(source.planned.employees.length, 2)
  assert.equal(source.scenario.scenario.id, "scenario-1")
})

test("factory registra os 14 KPIs oficiais e serviço avalia e persiste todos", async () => {
  const providers = createPlanningKPIProviders()
  const definitions = createPlanningKPIDefinitions(providers, instant)
  assert.equal(definitions.length, 14)
  const registry = new KPIRegistry()
  const repository = new InMemoryKPIEvaluationRepository()
  let id = 0
  const application = new KPIEvaluationApplicationService(
    new KPIEvaluationService(registry, new KPIEngine(new KPICalculatorEngine(() => instant)),
      { now: () => instant }, { generate: () => `evaluation-${++id}` }), repository)
  const service = new PlanningKPIService(providers, definitions, registry, application)
  const output = await service.evaluate(createSource(emptyOrganization(), organization(2)), {
    companyId: "company-1", periodStart: instant, periodEnd: instant, evaluatedAt: instant,
  })
  assert.equal(output.evaluations.length, 14)
  assert.equal(registry.listByOwnerModule("organization-planning").length, 14)
  assert.equal((await repository.listByCompany({ companyId: "company-1" })).length, 14)
})

function createSource(current: ProjectedOrganization, planned: ProjectedOrganization,
  events: PlanningKPISource["scenario"]["events"] = []): PlanningKPISource {
  return Object.freeze({ current, planned, departments: planned.departments, teams: planned.teams,
    positions: planned.positions, employees: planned.employees,
    scenario: Object.freeze({ scenario: scenario(), events: Object.freeze([...events]) }) })
}

function emptyOrganization(): ProjectedOrganization {
  return { departments: [], teams: [], positions: [], employees: [], vacancies: [],
    metrics: { headcount: 0, vacancies: 0, salaryMass: 0, departments: 0, positions: 0 } }
}

function organization(headcount: number, salaryMass = 100): ProjectedOrganization {
  const positions = [0, 1].map((index) => ({ id: `p${index}`, name: `P${index}`, description: null,
    departmentId: "d2", hierarchicalLevel: "analyst" as const, weeklyWorkloadHours: 40,
    workModel: "remote" as const, employmentType: "clt" as const,
    travelRequirement: "none" as const, status: "active" as const }))
  return {
    departments: [
      { id: "d1", name: "Root", code: null, description: null, parentDepartmentId: null, status: "active" },
      { id: "d2", name: "Child", code: null, description: null, parentDepartmentId: "d1", status: "active" },
      { id: "d3", name: "Old", code: null, description: null, parentDepartmentId: null, status: "archived" },
    ],
    teams: [{ id: "t1", name: "Team", code: null, description: null, departmentId: "d2", status: "active" }],
    positions,
    employees: Array.from({ length: headcount }, (_, index) => ({ id: `e${index}`, positionId: `p${index}`, status: "active" as const })),
    vacancies: [{ id: "v1", positionId: "p1", status: "active" }],
    metrics: { headcount, vacancies: 1, salaryMass, departments: 2, positions: 2 },
  }
}

function scenario() {
  return { id: "scenario-1", companyId: "company-1", workspaceId: "workspace-1",
    baseSnapshotId: "snapshot-1", name: "Scenario", description: null, status: "draft" as const,
    version: 1, createdAt: instant, updatedAt: instant }
}

function snapshot(organization: ProjectedOrganization) {
  return { id: "snapshot-1", companyId: "company-1", workspaceId: "workspace-1",
    sourceScenarioId: null, version: 1, publishedAt: instant, organization }
}
