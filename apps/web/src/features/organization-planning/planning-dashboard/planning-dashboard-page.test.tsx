import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { PlanningDashboardViewModel } from "../application"
import { PlanningDashboardEmptyState } from "./components/empty-state"
import { PlanningDashboardLoadingState } from "./components/loading-state"
import { PlanningDashboardPage } from "./planning-dashboard-page"

Object.assign(globalThis, { React })

const dashboard: PlanningDashboardViewModel = {
  scenario: {
    id: "scenario-1",
    companyId: "company-1",
    workspaceId: "workspace-1",
    baseSnapshotId: "snapshot-1",
    parentScenarioId: null,
    branchDepth: 0,
    branchPath: "scenario-1",
    name: "Expansão Nordeste",
    description: "Cenário executivo para expansão regional.",
    status: "approved",
    version: 4,
    createdAt: "2026-07-01T09:00:00.000Z",
    updatedAt: "2026-07-20T09:00:00.000Z",
  },
  comparison: {
    summary: { totalChanges: 5, totalChangesLabel: "5 alterações", isEmpty: false },
    metrics: [
      { id: "headcount", label: "Headcount", before: 10, beforeLabel: "10 colaboradores", after: 12, afterLabel: "12 colaboradores", delta: 2, deltaLabel: "+2 colaboradores", color: "blue", icon: "arrow-up" },
      { id: "vacancies", label: "Vagas ativas", before: 1, beforeLabel: "1 vaga", after: 2, afterLabel: "2 vagas", delta: 1, deltaLabel: "+1 vaga", color: "blue", icon: "arrow-up" },
      { id: "departments", label: "Departamentos ativos", before: 2, beforeLabel: "2 departamentos", after: 3, afterLabel: "3 departamentos", delta: 1, deltaLabel: "+1 departamento", color: "blue", icon: "arrow-up" },
      { id: "positions", label: "Cargos ativos", before: 5, beforeLabel: "5 cargos", after: 6, afterLabel: "6 cargos", delta: 1, deltaLabel: "+1 cargo", color: "blue", icon: "arrow-up" },
    ],
    sections: [
      { id: "departments", label: "Departamentos", total: 1, totalLabel: "1 alteração", isEmpty: false, changes: [{ id: "departments:created:department-1", entityId: "department-1", entityLabel: "Operações", changeType: "created", changeLabel: "Criado", changedFields: [] }] },
      { id: "teams", label: "Times", total: 1, totalLabel: "1 alteração", isEmpty: false, changes: [{ id: "teams:created:team-1", entityId: "team-1", entityLabel: "Expansão", changeType: "created", changeLabel: "Criado", changedFields: [] }] },
      { id: "positions", label: "Cargos", total: 1, totalLabel: "1 alteração", isEmpty: false, changes: [{ id: "positions:created:position-1", entityId: "position-1", entityLabel: "Analista", changeType: "created", changeLabel: "Criado", changedFields: [] }] },
      { id: "employees", label: "Colaboradores", total: 1, totalLabel: "1 alteração", isEmpty: false, changes: [{ id: "employees:transferred:employee-1", entityId: "employee-1", entityLabel: "employee-1", changeType: "transferred", changeLabel: "Transferido", changedFields: ["Alocação"] }] },
      { id: "vacancies", label: "Vagas", total: 1, totalLabel: "1 alteração", isEmpty: false, changes: [{ id: "vacancies:created:vacancy-1", entityId: "vacancy-1", entityLabel: "vacancy-1", changeType: "created", changeLabel: "Criada", changedFields: [] }] },
    ],
  },
  insights: {
    summary: {
      totalChanges: 5,
      totalChangesLabel: "5 alterações",
      entitiesAffected: 5,
      entitiesAffectedLabel: "5 entidades afetadas",
      organizationalGrowth: 2,
      organizationalGrowthLabel: "+2 colaboradores",
      organizationalReduction: 0,
      organizationalReductionLabel: "0 colaboradores",
      risk: { value: "medium", label: "Médio", riskLabel: "Risco Médio", color: "amber", icon: "alert-triangle" },
    },
    kpis: [
      { id: "headcount_delta", label: "Variação de headcount", value: 2, valueLabel: "+2 colaboradores", color: "blue", icon: "users" },
      { id: "teams_created", label: "Times criados", value: 1, valueLabel: "1 time", color: "blue", icon: "users" },
      { id: "employees_transferred", label: "Colaboradores transferidos", value: 1, valueLabel: "1 colaborador", color: "blue", icon: "arrow-right-left" },
      { id: "employees_terminated", label: "Colaboradores desligados", value: 0, valueLabel: "0 colaboradores", color: "slate", icon: "arrow-down" },
    ],
    warnings: [{ id: "high-transfer-volume", title: "Volume de transferências", description: "Revise a capacidade de absorção dos times.", category: "Pessoas", badge: "Médio", color: "amber", icon: "alert-triangle" }],
    opportunities: [{ id: "growth-opportunity", title: "Crescimento organizacional", description: "O cenário amplia a capacidade da organização.", category: "Estrutura", color: "green", icon: "lightbulb" }],
    riskIndicators: [],
    recommendations: [{ id: "review-management-capacity", title: "Revisar capacidade gerencial", description: "Valide o span de gestão após as mudanças.", priority: "recommended", priorityLabel: "Recomendada" }],
  },
  generatedAt: "2026-07-29T12:30:00.000Z",
  version: 4,
}

test("renderiza o dashboard com resumo, KPIs e impacto estrutural", () => {
  const html = renderToStaticMarkup(<PlanningDashboardPage dashboard={dashboard} />)

  assert.match(html, /Expansão Nordeste/)
  assert.match(html, /O cenário reúne 5 alterações, com 5 entidades afetadas e risco médio/)
  assert.match(html, /Headcount/)
  assert.match(html, /Antes: 10 colaboradores · Delta: \+2 colaboradores/)
  assert.match(html, /Times criados/)
  assert.match(html, /Mudanças estruturais/)
  assert.match(html, /Transferido: employee-1/)
})

test("renderiza riscos, recomendações, oportunidades e workflow de publicação", () => {
  const html = renderToStaticMarkup(<PlanningDashboardPage dashboard={dashboard} />)

  assert.match(html, /Volume de transferências/)
  assert.match(html, /Revisar capacidade gerencial/)
  assert.match(html, /Crescimento organizacional/)
  assert.match(html, /Pronto para validar/)
  assert.match(html, /Publicar Cenário/)
  assert.match(html, />4</)
})

test("renderiza o estado vazio sem os painéis de mudanças", () => {
  const emptyDashboard: PlanningDashboardViewModel = {
    ...dashboard,
    comparison: {
      ...dashboard.comparison,
      summary: { totalChanges: 0, totalChangesLabel: "0 alterações", isEmpty: true },
    },
  }
  const html = renderToStaticMarkup(<PlanningDashboardPage dashboard={emptyDashboard} />)

  assert.match(html, /Nenhuma alteração neste cenário/)
  assert.doesNotMatch(html, /Indicadores do cenário/)
  assert.match(html, /Prontidão para publicação/)
})

test("renderiza o estado de carregamento acessível", () => {
  const html = renderToStaticMarkup(<PlanningDashboardLoadingState />)

  assert.match(html, /aria-busy="true"/)
  assert.match(html, /Carregando dashboard de planejamento/)
})

test("renderiza o estado vazio isoladamente", () => {
  const html = renderToStaticMarkup(<PlanningDashboardEmptyState />)

  assert.match(html, /Nenhuma alteração neste cenário/)
})

test("produz markup determinístico para o mesmo ViewModel", () => {
  const first = renderToStaticMarkup(<PlanningDashboardPage dashboard={dashboard} />)
  const second = renderToStaticMarkup(<PlanningDashboardPage dashboard={dashboard} />)

  assert.equal(second, first)
})
