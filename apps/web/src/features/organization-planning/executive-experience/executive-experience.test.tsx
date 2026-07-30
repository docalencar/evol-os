import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import type { ExecutiveDashboardViewModel } from "../executive-dashboard"
import type { PlanningTimelineViewModel } from "../timeline"
import { ExecutiveLayout } from "./executive-layout"
import { ExecutiveNavigationService } from "./executive-navigation-service"

Object.assign(globalThis, { React })

test("composes dashboard and timeline ViewModels without recalculation", async () => {
  let dashboardCalls = 0
  let timelineCalls = 0
  const service = new ExecutiveNavigationService(
    { async execute(id) { dashboardCalls += 1; assert.equal(id, "scenario-1"); return dashboard } },
    { async execute(input) { timelineCalls += 1; assert.deepEqual(input, { workspaceId: "workspace-1" }); return timeline } }
  )
  const result = await service.execute("scenario-1")
  assert.equal(result.dashboard, dashboard)
  assert.equal(result.timeline, timeline)
  assert.equal(dashboardCalls, 1)
  assert.equal(timelineCalls, 1)
  assert.equal(Object.isFrozen(result), true)
})

test("renders navigation, overview, scenario selector, actions and export", () => {
  const experience = Object.freeze({ dashboard, timeline })
  const html = renderToStaticMarkup(<ExecutiveLayout experience={experience}><div>Conteúdo executivo</div></ExecutiveLayout>)
  assert.match(html, /Experiência Executiva/)
  assert.match(html, /Selecionar cenário executivo/)
  assert.match(html, /Cenário principal/)
  assert.match(html, /Cenário alternativo/)
  assert.match(html, /Abrir cenário/)
  assert.match(html, /Timeline/)
  assert.match(html, /Exportar PDF \/ Imprimir/)
  assert.match(html, /Conteúdo executivo/)
})

test("produces deterministic markup from the same ViewModels", () => {
  const experience = Object.freeze({ dashboard, timeline })
  const render = () => renderToStaticMarkup(<ExecutiveLayout experience={experience}><div>Conteúdo</div></ExecutiveLayout>)
  assert.equal(render(), render())
})

const dashboard: ExecutiveDashboardViewModel = Object.freeze({
  scenario: Object.freeze({ id: "scenario-1", workspaceId: "workspace-1", name: "Cenário principal", status: "approved", version: 3 }),
  summary: Object.freeze({ headline: "Resumo apresentado.", riskLabel: "Risco Baixo", color: "slate", icon: "circle" }),
  headcount: null,
  metrics: Object.freeze([]),
  alerts: Object.freeze([]),
  impacts: Object.freeze([]),
  generatedAt: "2026-07-29T12:00:00.000Z",
  isEmpty: false,
})

const timeline: PlanningTimelineViewModel = Object.freeze({
  workspaceId: "workspace-1",
  isEmpty: false,
  items: Object.freeze([
    timelineItem("scenario-1", "Cenário principal", "Aprovado"),
    timelineItem("scenario-2", "Cenário alternativo", "Rascunho"),
  ]),
})

function timelineItem(id: string, name: string, statusLabel: string) {
  return Object.freeze({
    id, version: 1, name, status: "draft", statusLabel,
    createdAt: "2026-07-01T00:00:00.000Z", createdAtLabel: "1 jul. 2026",
    updatedAt: "2026-07-01T00:00:00.000Z", updatedAtLabel: "1 jul. 2026",
    publishedAt: null, publishedAtLabel: null, author: null,
    baselineVersion: 1, baselineVersionLabel: "Snapshot v1",
    summary: `${name} na versão 1.`, badges: Object.freeze([]), current: id === "scenario-1", published: false,
  })
}
