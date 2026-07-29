import assert from "node:assert/strict"
import test from "node:test"

import type { PlanningInsights } from "../../planning-insights"
import { PlanningInsightsPresenter } from "./planning-insights-presenter"

const presenter = PlanningInsightsPresenter.create()

test("presents KPI cards, warnings, recommendations and opportunities", () => {
  const insights = planningInsights()
  const original = structuredClone(insights)
  const viewModel = presenter.present(insights)

  assert.equal(viewModel.summary.risk.riskLabel, "Risco Crítico")
  assert.equal(viewModel.summary.organizationalGrowthLabel, "+3 colaboradores")
  assert.equal(viewModel.summary.organizationalReductionLabel, "0 colaboradores")
  assert.equal(viewModel.kpis.find((kpi) => kpi.id === "headcount_delta")?.valueLabel, "+3 colaboradores")
  assert.deepEqual(viewModel.warnings[0], {
    id: "headcount_reduction",
    title: "Redução relevante de headcount",
    description: "Descrição estável da engine.",
    category: "Pessoas",
    badge: "Crítico",
    color: "red",
    icon: "alert-triangle",
  })
  assert.equal(viewModel.recommendations[0]?.title, "Validar plano de sucessão")
  assert.equal(viewModel.recommendations[0]?.priority, "recommended")
  assert.equal(viewModel.opportunities[0]?.title, "Nova capacidade organizacional")
  assert.equal(viewModel.riskIndicators[0]?.valueLabel, "30%")
  assert.equal(viewModel.riskIndicators[1]?.valueLabel, "12 alterações")
  assert.deepEqual(insights, original)
  assertDeepFrozen(viewModel)
})

test("is deterministic and does not share result arrays or objects", () => {
  const insights = planningInsights()
  const first = presenter.present(insights)
  const second = presenter.present(insights)

  assert.deepEqual(first, second)
  assert.notEqual(first.warnings, insights.warnings)
  assert.notEqual(first.warnings[0], insights.warnings[0])
  assert.notEqual(first.recommendations, insights.recommendations)
})

function planningInsights(): PlanningInsights {
  return Object.freeze({
    summary: Object.freeze({
      totalChanges: 12,
      entitiesAffected: 12,
      organizationalGrowth: 3,
      organizationalReduction: 0,
      riskLevel: "critical" as const,
    }),
    kpis: Object.freeze({
      headcountDelta: 3,
      vacanciesDelta: -1,
      departmentsCreated: 1,
      departmentsArchived: 1,
      teamsCreated: 2,
      positionsCreated: 3,
      employeesTransferred: 2,
      employeesTerminated: 1,
      vacanciesClosed: 1,
    }),
    warnings: Object.freeze([
      Object.freeze({
        id: "headcount_reduction",
        category: "workforce" as const,
        severity: "critical" as const,
        message: "Descrição estável da engine.",
      }),
    ]),
    opportunities: Object.freeze([
      Object.freeze({
        id: "new_organizational_capacity",
        category: "capacity" as const,
        message: "Capacidade adicionada.",
      }),
    ]),
    organizationalImpact: Object.freeze({
      structuralChanges: 6,
      workforceChanges: 4,
      vacancyChanges: 2,
      departmentsRemoved: 1,
    }),
    riskIndicators: Object.freeze([
      Object.freeze({
        id: "headcount_reduction",
        category: "workforce" as const,
        severity: "critical" as const,
        value: 30,
        threshold: 25,
      }),
      Object.freeze({
        id: "excessive_structural_changes",
        category: "structure" as const,
        severity: "medium" as const,
        value: 12,
        threshold: 10,
      }),
    ]),
    recommendations: Object.freeze([
      Object.freeze({
        id: "validate_succession_plan",
        category: "workforce" as const,
        message: "Validar antes da execução.",
      }),
    ]),
  })
}

function assertDeepFrozen(value: unknown, visited = new Set<object>()): void {
  if (typeof value !== "object" || value === null || visited.has(value)) return
  visited.add(value)
  assert.equal(Object.isFrozen(value), true)
  for (const nested of Object.values(value)) assertDeepFrozen(nested, visited)
}
