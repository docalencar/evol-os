import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { ExecutiveApplicationService } from "../application"
import {
  ExecutiveEmptyState,
  ExecutiveHome,
  ExecutiveLoadingState,
  ExecutiveNarrative,
  ExecutiveSummary,
} from "../components"
import { ExecutivePresenter } from "../presenters"
import {
  ExecutiveQueryService,
  type ExecutiveHomeSource,
} from "../queries/executive-query-service"
import type { ExecutiveHomeDTO } from "../types"

Object.assign(globalThis, { React })

const dto = Object.freeze({
  generatedAt: "2026-07-31T12:00:00.000Z",

  overview: Object.freeze({
    totalEmployees: 120,
    criticalEmployees: 3,
    organizationalRisks: 2,
    aiSuggestions: 4,
  }),

  dashboard: Object.freeze({
    title: "Executive Dashboard",
    subtitle: "Visão consolidada da empresa",
    generatedAtLabel: "31/07/2026, 09:00",
    isEmpty: false,

    summary: Object.freeze([]),
    execution: Object.freeze([]),
    planning: Object.freeze([]),

    planningContext: Object.freeze({
      currentScenario: "Cenário atual",
      baseScenario: "Baseline",
    }),

    health: Object.freeze([]),
    workers: Object.freeze([]),
    timeline: Object.freeze([]),

    alerts: Object.freeze([
      "Três colaboradores estão em condição crítica.",
    ]),
  }),
}) satisfies ExecutiveHomeDTO

test("Presenter cria resumo executivo crítico", () => {
  const executive = new ExecutivePresenter().present(dto)

  assert.equal(executive.brief.title, "Centro Executivo")
  assert.equal(executive.brief.status, "critical")
  assert.equal(executive.brief.statusLabel, "Crítico")
  assert.equal(executive.brief.totalEmployeesLabel, "120")
  assert.equal(executive.brief.criticalEmployeesLabel, "3")
  assert.equal(executive.brief.organizationalRisksLabel, "2")
  assert.equal(executive.brief.aiSuggestionsLabel, "4")
  assert.equal(executive.brief.alertCountLabel, "1")

  assert.equal(executive.decisionFeed.isEmpty, false)
  assert.equal(executive.decisionFeed.items.length, 1)
  assert.equal(
    executive.decisionFeed.items[0]?.description,
    "Três colaboradores estão em condição crítica.",
  )
})

test("Presenter produz narrativa usando apenas informações disponíveis", () => {
  const executive = new ExecutivePresenter().present(dto)

  assert.match(
    executive.narrative.body,
    /A organização possui 120 colaboradores/,
  )

  assert.match(
    executive.narrative.body,
    /3 colaborador\(es\) exigem atenção imediata/,
  )

  assert.match(
    executive.narrative.body,
    /2 risco\(s\) organizacional\(is\)/,
  )

  assert.match(
    executive.narrative.body,
    /1 alerta\(s\) executivo\(s\) ativo\(s\)/,
  )
})

test("Query Service delega uma única leitura para a fonte", async () => {
  let calls = 0

  const source: ExecutiveHomeSource = {
    async load() {
      calls += 1
      return dto
    },
  }

  const result = await new ExecutiveQueryService(source).load()

  assert.equal(calls, 1)
  assert.equal(result, dto)
})

test("Application Service coordena Query Service e Presenter", async () => {
  const source: ExecutiveHomeSource = {
    async load() {
      return dto
    },
  }

  const application = new ExecutiveApplicationService(
    new ExecutiveQueryService(source),
    new ExecutivePresenter(),
  )

  const result = await application.execute()

  assert.equal(result.brief.title, "Centro Executivo")
  assert.equal(result.dashboard, dto.dashboard)
  assert.equal(result.decisionFeed.items.length, 1)
})

test("Executive Summary renderiza estado e indicadores", () => {
  const executive = new ExecutivePresenter().present(dto)

  const html = renderToStaticMarkup(
    <ExecutiveSummary brief={executive.brief} />,
  )

  assert.match(html, /Centro Executivo/)
  assert.match(html, /Crítico/)
  assert.match(html, /Colaboradores críticos/)
  assert.match(html, />3</)
})

test("Executive Narrative renderiza o resumo preparado pelo Presenter", () => {
  const executive = new ExecutivePresenter().present(dto)

  const html = renderToStaticMarkup(
    <ExecutiveNarrative narrative={executive.narrative} />,
  )

  assert.match(html, /Resumo executivo/)
  assert.match(html, /120 colaboradores/)
  assert.match(html, /Crítico/)
})

test("Executive Home renderiza summary, narrative, ações, feed, insights e dashboard", () => {
  const executive = new ExecutivePresenter().present(dto)

  const html = renderToStaticMarkup(
    <ExecutiveHome data={executive} />,
  )

  const expectedContents = [
    "Centro Executivo",
    "Resumo executivo",
    "Ações rápidas",
    "Decision Feed",
    "Atenção executiva",
    "Executive Insights",
    "Executive Dashboard",
  ]

  for (const expected of expectedContents) {
    assert.match(html, new RegExp(expected))
  }
})

test("Presenter identifica estado vazio sem inventar informações", () => {
  const emptyDTO: ExecutiveHomeDTO = {
    generatedAt: dto.generatedAt,

    overview: {
      totalEmployees: 0,
      criticalEmployees: 0,
      organizationalRisks: 0,
      aiSuggestions: 0,
    },

    dashboard: {
      ...dto.dashboard,
      isEmpty: true,
      alerts: [],
    },
  }

  const executive = new ExecutivePresenter().present(emptyDTO)

  assert.equal(executive.isEmpty, true)
  assert.equal(executive.brief.status, "healthy")
  assert.equal(executive.decisionFeed.isEmpty, true)

  assert.match(
    executive.narrative.body,
    /Nenhum ponto crítico exige ação imediata/,
  )
})

test("Executive Home renderiza o empty state", () => {
  const emptyDTO: ExecutiveHomeDTO = {
    generatedAt: dto.generatedAt,

    overview: {
      totalEmployees: 0,
      criticalEmployees: 0,
      organizationalRisks: 0,
      aiSuggestions: 0,
    },

    dashboard: {
      ...dto.dashboard,
      isEmpty: true,
      alerts: [],
    },
  }

  const executive = new ExecutivePresenter().present(emptyDTO)

  const html = renderToStaticMarkup(
    <ExecutiveHome data={executive} />,
  )

  assert.match(html, /Visão executiva ainda sem dados/)
  assert.doesNotMatch(html, /Decision Feed/)
})

test("Estados vazio e loading possuem textos acessíveis", () => {
  const empty = renderToStaticMarkup(
    <ExecutiveEmptyState />,
  )

  const loading = renderToStaticMarkup(
    <ExecutiveLoadingState />,
  )

  assert.match(empty, /Visão executiva ainda sem dados/)
  assert.match(loading, /aria-busy="true"/)
  assert.match(loading, /Carregando Centro Executivo/)
})