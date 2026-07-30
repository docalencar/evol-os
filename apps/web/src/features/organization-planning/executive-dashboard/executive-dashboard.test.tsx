import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { PlanningDashboardViewModel } from "../application"
import { ExecutiveDashboardPage } from "./executive-dashboard-page"
import { ExecutiveLoadingState } from "./executive-loading-state"
import { ExecutiveDashboardPresenter } from "./executive-dashboard-presenter"
import { ExecutiveDashboardService } from "./executive-dashboard-service"

Object.assign(globalThis, { React })

test("presents KPIs, headcount, alerts, summary and comparison without recalculation", () => {
  const result = ExecutiveDashboardPresenter.create().present(planningDashboard)
  assert.equal(result.headcount?.valueLabel, "12 colaboradores")
  assert.equal(result.headcount?.contextLabel, "10 colaboradores → 12 colaboradores (+2 colaboradores)")
  assert.deepEqual(result.metrics.map((metric) => metric.id), ["vacancies", "employees_transferred"])
  assert.equal(result.alerts[0]?.title, "Volume de transferências")
  assert.equal(result.summary.headline, "O cenário reúne 3 alterações, com 3 entidades afetadas e risco médio.")
  assert.equal(result.impacts[0]?.totalLabel, "1 alteração")
  assertDeepFrozen(result)
})

test("orchestrates the existing read model exactly once and is deterministic", async () => {
  let calls = 0
  const presenter = ExecutiveDashboardPresenter.create()
  const service = new ExecutiveDashboardService({ async execute(scenarioId) { calls += 1; assert.equal(scenarioId, "scenario-1"); return planningDashboard } }, presenter)
  const first = await service.execute("scenario-1")
  const second = await service.execute("scenario-1")
  assert.deepEqual(second, first)
  assert.equal(calls, 2)
})

test("renders executive content, headcount and alerts", () => {
  const dashboard = ExecutiveDashboardPresenter.create().present(planningDashboard)
  const html = renderToStaticMarkup(<ExecutiveDashboardPage dashboard={dashboard} />)
  assert.match(html, /Dashboard Executivo — Expansão regional/)
  assert.match(html, /12 colaboradores/)
  assert.match(html, /Indicadores executivos/)
  assert.match(html, /Volume de transferências/)
  assert.match(html, /Impactos organizacionais/)
})

test("renders empty and loading states", () => {
  const empty = ExecutiveDashboardPresenter.create().present({ ...planningDashboard, comparison: { ...planningDashboard.comparison, summary: { totalChanges: 0, totalChangesLabel: "0 alterações", isEmpty: true } } })
  assert.match(renderToStaticMarkup(<ExecutiveDashboardPage dashboard={empty} />), /Nenhum impacto organizacional/)
  assert.match(renderToStaticMarkup(<ExecutiveLoadingState />), /aria-busy="true"/)
})

const planningDashboard: PlanningDashboardViewModel = {
  scenario: {
    id: "scenario-1", companyId: "company-1", workspaceId: "workspace-1", baseSnapshotId: "snapshot-1",
    parentScenarioId: null, branchDepth: 0, branchPath: "scenario-1", name: "Expansão regional", description: null,
    status: "approved", version: 4, createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-02T00:00:00.000Z",
  },
  comparison: {
    summary: { totalChanges: 3, totalChangesLabel: "3 alterações", isEmpty: false },
    metrics: [
      { id: "headcount", label: "Headcount", before: 10, beforeLabel: "10 colaboradores", after: 12, afterLabel: "12 colaboradores", delta: 2, deltaLabel: "+2 colaboradores", color: "blue", icon: "arrow-up" },
      { id: "vacancies", label: "Vagas ativas", before: 1, beforeLabel: "1 vaga", after: 2, afterLabel: "2 vagas", delta: 1, deltaLabel: "+1 vaga", color: "blue", icon: "arrow-up" },
    ],
    sections: [{ id: "departments", label: "Departamentos", total: 1, totalLabel: "1 alteração", changes: [], isEmpty: false }],
  },
  insights: {
    summary: { totalChanges: 3, totalChangesLabel: "3 alterações", entitiesAffected: 3, entitiesAffectedLabel: "3 entidades afetadas", organizationalGrowth: 2, organizationalGrowthLabel: "+2 colaboradores", organizationalReduction: 0, organizationalReductionLabel: "0 colaboradores", risk: { value: "medium", label: "Médio", riskLabel: "Risco Médio", color: "amber", icon: "alert-triangle" } },
    kpis: [{ id: "employees_transferred", label: "Transferências", value: 1, valueLabel: "1 colaborador", color: "amber", icon: "arrow-right-left" }],
    warnings: [{ id: "transfer-volume", title: "Volume de transferências", description: "Revisar capacidade.", category: "Pessoas", badge: "Médio", color: "amber", icon: "alert-triangle" }],
    opportunities: [], riskIndicators: [], recommendations: [],
  },
  generatedAt: "2026-07-29T12:00:00.000Z",
  version: 4,
}

function assertDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return
  assert.equal(Object.isFrozen(value), true)
  for (const nested of Object.values(value)) assertDeepFrozen(nested)
}
