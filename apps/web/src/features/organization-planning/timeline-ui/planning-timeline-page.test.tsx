import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { PlanningTimelineViewModel } from "../timeline"
import { TimelineErrorState } from "./components/timeline-error-state"
import { TimelineLoadingState } from "./components/timeline-loading-state"
import { PlanningTimelinePage } from "./planning-timeline-page"

Object.assign(globalThis, { React })

const timeline: PlanningTimelineViewModel = {
  workspaceId: "workspace-1",
  isEmpty: false,
  items: [
    {
      id: "scenario-1",
      version: 4,
      name: "Expansão Nordeste",
      status: "published",
      statusLabel: "Publicado",
      createdAt: "2026-07-01T10:00:00.000Z",
      createdAtLabel: "1 de jul. de 2026, 10:00",
      updatedAt: "2026-07-05T15:00:00.000Z",
      updatedAtLabel: "5 de jul. de 2026, 15:00",
      publishedAt: "2026-07-05T15:00:00.000Z",
      publishedAtLabel: "5 de jul. de 2026, 15:00",
      author: null,
      baselineVersion: 1,
      baselineVersionLabel: "Snapshot v1",
      summary: "Expansão Nordeste está publicado na versão 4.",
      badges: [
        { id: "status", label: "Publicado", color: "blue" },
        { id: "published", label: "Publicado", color: "green" },
      ],
      current: false,
      published: true,
    },
    {
      id: "scenario-2",
      version: 2,
      name: "Reorganização Comercial",
      status: "draft",
      statusLabel: "Rascunho",
      createdAt: "2026-07-10T09:00:00.000Z",
      createdAtLabel: "10 de jul. de 2026, 09:00",
      updatedAt: "2026-07-11T09:00:00.000Z",
      updatedAtLabel: "11 de jul. de 2026, 09:00",
      publishedAt: null,
      publishedAtLabel: null,
      author: null,
      baselineVersion: 2,
      baselineVersionLabel: "Snapshot v2",
      summary: "Reorganização Comercial está rascunho na versão 2.",
      badges: [
        { id: "status", label: "Rascunho", color: "slate" },
        { id: "current", label: "Atual", color: "blue" },
      ],
      current: true,
      published: false,
    },
  ],
}

test("renderiza a Timeline vertical com múltiplos cenários", () => {
  const html = renderToStaticMarkup(<PlanningTimelinePage timeline={timeline} />)

  assert.match(html, /Timeline de cenários/)
  assert.match(html, /aria-label="Evolução dos cenários"/)
  assert.match(html, /Expansão Nordeste/)
  assert.match(html, /Reorganização Comercial/)
  assert.match(html, /v4/)
  assert.match(html, /v2/)
})

test("exibe badges, datas, resumo e baseline diretamente do ViewModel", () => {
  const html = renderToStaticMarkup(<PlanningTimelinePage timeline={timeline} />)

  assert.match(html, /Publicado/)
  assert.match(html, /Rascunho/)
  assert.match(html, /Atual/)
  assert.match(html, /5 de jul. de 2026, 15:00/)
  assert.match(html, /Expansão Nordeste está publicado na versão 4/)
  assert.match(html, /Snapshot v1/)
  assert.match(html, /Não publicado/)
})

test("mantém ações futuras desabilitadas e expõe operações de cenário", () => {
  const html = renderToStaticMarkup(<PlanningTimelinePage timeline={timeline} />)

  for (const action of ["Visualizar", "Comparar", "Publicar"]) {
    assert.match(html, new RegExp(`disabled=""[^>]*>${action}</button>`))
  }
  assert.match(html, /Operações de Expansão Nordeste/)
  assert.match(html, /Operações de Reorganização Comercial/)
})

test("renderiza a Timeline vazia", () => {
  const emptyTimeline: PlanningTimelineViewModel = {
    workspaceId: "workspace-1",
    items: [],
    isEmpty: true,
  }
  const html = renderToStaticMarkup(<PlanningTimelinePage timeline={emptyTimeline} />)

  assert.match(html, /Nenhum cenário na Timeline/)
  assert.doesNotMatch(html, /aria-label="Evolução dos cenários"/)
})

test("renderiza os estados de loading e error", () => {
  const loading = renderToStaticMarkup(<TimelineLoadingState />)
  const error = renderToStaticMarkup(<TimelineErrorState retry={() => undefined} />)

  assert.match(loading, /aria-busy="true"/)
  assert.match(loading, /Carregando Timeline de cenários/)
  assert.match(error, /Não foi possível carregar a Timeline/)
  assert.match(error, /Tentar novamente/)
})

test("produz markup determinístico para o mesmo ViewModel", () => {
  const first = renderToStaticMarkup(<PlanningTimelinePage timeline={timeline} />)
  const second = renderToStaticMarkup(<PlanningTimelinePage timeline={timeline} />)

  assert.equal(second, first)
})
