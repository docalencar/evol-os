import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  KPIDashboardEmptyState,
  KPIDashboardLoadingState,
  KPIDashboardPage,
  StatusBadge,
  Timeline,
  WorkersTable,
} from "../components"
import { KPIDashboardPresenter } from "../presenters"
import { KPIDashboardQueryService } from "../queries/kpi-dashboard-query-service"
import type { KPIDashboardDTO } from "../types"

Object.assign(globalThis, { React })

const dto = Object.freeze({
  companyName: "Evol",
  generatedAt: "2026-07-30T12:00:00.000Z",
  metrics: Object.freeze([
    Object.freeze({
      id: "employees",
      label: "Total Employees",
      value: 120,
      unit: "number" as const,
      variation: 5,
      trend: "up" as const,
      status: "healthy" as const,
      updatedAt: "2026-07-30T12:00:00.000Z",
      description: "Pessoas ativas",
    }),
  ]),
  execution: Object.freeze({
    running: 2,
    succeeded: 90,
    failed: 1,
    interrupted: 1,
    recoveries: 3,
    retries: 4,
    durationMs: 250,
    throughput: 12,
    successRate: 97.8,
  }),
  planning: Object.freeze({
    currentScenario: "Crescimento",
    baseScenario: "Atual",
    financialImpact: 50000,
    plannedHeadcount: 130,
    plannedPayroll: 900000,
    affectedDepartments: 4,
  }),
  workers: Object.freeze([
    Object.freeze({
      id: "worker-1",
      runtimeId: "runtime-1",
      status: "healthy" as const,
      lastCycleAt: "2026-07-30T11:59:00.000Z",
      activeLeases: 2,
    }),
  ]),
  timeline: Object.freeze([
    Object.freeze({
      id: "older",
      kind: "execution" as const,
      occurredAt: "2026-07-30T10:00:00.000Z",
      title: "Execução concluída",
      description: "KPI processado",
      status: "healthy" as const,
    }),
    Object.freeze({
      id: "newer",
      kind: "recovery" as const,
      occurredAt: "2026-07-30T11:00:00.000Z",
      title: "Recovery concluído",
      description: "Lease recuperada",
      status: "attention" as const,
    }),
  ]),
  runtimeStatus: "healthy" as const,
  schedulerStatus: "attention" as const,
  gatewayStatus: "healthy" as const,
  alerts: Object.freeze(["Uma execução falhou."]),
}) satisfies KPIDashboardDTO

test("Presenter formata percentuais, moeda, datas, status e tendências", () => {
  const dashboard = new KPIDashboardPresenter().present(dto)

  assert.equal(dashboard.summary[0]?.valueLabel, "120")
  assert.equal(dashboard.summary[0]?.variationLabel, "+5%")
  assert.equal(dashboard.summary[0]?.trendLabel, "Em alta")
  assert.match(dashboard.planning[0]?.valueLabel ?? "", /R\$/)
  assert.equal(
    dashboard.execution.find((item) => item.id === "success-rate")
      ?.valueLabel,
    "97,8%",
  )
  assert.deepEqual(
    dashboard.timeline.map((item) => item.id),
    ["newer", "older"],
  )
})

test("Query Service agrega uma única leitura e não executa infraestrutura", async () => {
  let calls = 0

  const service = new KPIDashboardQueryService({
    load: async () => {
      calls += 1
      return dto
    },
  })

  assert.equal((await service.load()).companyName, "Evol")
  assert.equal(calls, 1)
})

test("Dashboard renderiza cards, execution, planning, workers, runtime, timeline e IA placeholder", () => {
  const html = renderToStaticMarkup(
    <KPIDashboardPage
      dashboard={new KPIDashboardPresenter().present(dto)}
    />,
  )

  const expectedContents = [
    "Executive Summary",
    "Operational Health",
    "Execution KPIs",
    "Planning KPIs",
    "Crescimento",
    "Workers",
    "worker-1",
    "Timeline operacional",
    "Recovery concluído",
    "Alerts Preview",
    "AI Insights",
  ]

  for (const expected of expectedContents) {
    assert.match(html, new RegExp(expected))
  }
})

test("StatusBadge expõe estados saudável, atenção, crítico e indisponível", () => {
  const html = [
    <StatusBadge key="healthy" status="healthy" label="Saudável" />,
    <StatusBadge key="attention" status="attention" label="Atenção" />,
    <StatusBadge key="critical" status="critical" label="Crítico" />,
    <StatusBadge
      key="unavailable"
      status="unavailable"
      label="Indisponível"
    />,
  ]
    .map((component) => renderToStaticMarkup(component))
    .join("")

  for (const label of [
    "Saudável",
    "Atenção",
    "Crítico",
    "Indisponível",
  ]) {
    assert.match(html, new RegExp(label))
  }
})

test("Workers e Timeline exibem empty states tipados", () => {
  assert.match(
    renderToStaticMarkup(<WorkersTable workers={[]} />),
    /Nenhum worker disponível/,
  )

  assert.match(
    renderToStaticMarkup(<Timeline items={[]} />),
    /Timeline vazia/,
  )
})

test("Loading e empty state são acessíveis", () => {
  const loading = renderToStaticMarkup(<KPIDashboardLoadingState />)

  assert.match(loading, /aria-busy="true"/)
  assert.match(loading, /Carregando Executive Dashboard/)
  assert.match(
    renderToStaticMarkup(<KPIDashboardEmptyState />),
    /Indicadores ainda indisponíveis/,
  )
})

test("Presenter representa fontes ausentes sem inventar valores", () => {
  const emptyDTO: KPIDashboardDTO = {
    ...dto,
    metrics: dto.metrics.map((item) =>
      Object.freeze({
        ...item,
        value: null,
        status: "unavailable" as const,
      }),
    ),
    workers: [],
    timeline: [],
    planning: {
      currentScenario: null,
      baseScenario: null,
      financialImpact: null,
      plannedHeadcount: null,
      plannedPayroll: null,
      affectedDepartments: null,
    },
  }

  const empty = new KPIDashboardPresenter().present(emptyDTO)

  assert.equal(empty.isEmpty, true)
  assert.equal(empty.summary[0]?.valueLabel, "—")
  assert.equal(empty.planningContext.currentScenario, "Indisponível")
})