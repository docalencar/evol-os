import assert from "node:assert/strict"
import test from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { getSidebarItems } from "@/components/layout/sidebar"
import {
  canAccessExecutive,
  requireExecutiveAccess,
} from "../access/executive-access"
import { ExecutiveHome } from "../components"
import { ExecutivePresenter } from "../presenters"
import type { ExecutiveHomeDTO } from "../types"

Object.assign(globalThis, { React })

const generatedAt = "2026-09-28T12:00:00.000Z"

function dto(
  sourceFailures: ExecutiveHomeDTO["sourceFailures"] = [],
): ExecutiveHomeDTO {
  return {
    generatedAt,
    overview: {
      totalEmployees: 2,
      criticalEmployees: 1,
      organizationalRisks: 1,
      aiSuggestions: 1,
    },
    dashboard: {
      title: "Executive Dashboard",
      subtitle: "Visão consolidada",
      generatedAtLabel: "28/09/2026",
      isEmpty: false,
      summary: [],
      execution: [],
      planning: [],
      planningContext: {
        currentScenario: "Indisponível",
        baseScenario: "Indisponível",
      },
      health: [],
      workers: [],
      timeline: [],
      alerts: [],
    },
    decisionFeed: { generatedAt, items: [] },
    sourceFailures,
  }
}

test("Executive access is restricted to the shared administrative roles", () => {
  for (const role of ["owner", "admin", "hr"] as const) {
    assert.equal(canAccessExecutive(role), true)
    assert.equal(
      getSidebarItems(role).some((item) => item.href === "/app/executive"),
      true,
    )
  }

  for (const role of ["manager", "employee"] as const) {
    assert.equal(canAccessExecutive(role), false)
    assert.equal(
      getSidebarItems(role).some((item) => item.href === "/app/executive"),
      false,
    )
  }
})

test("the route guard enters for an allowed actor and invokes opaque denial otherwise", () => {
  let denials = 0
  const deny = (): never => {
    denials += 1
    throw new Error("opaque-denial")
  }

  assert.doesNotThrow(() => requireExecutiveAccess("owner", deny))
  assert.equal(denials, 0)
  assert.throws(
    () => requireExecutiveAccess("manager", deny),
    /opaque-denial/,
  )
  assert.equal(denials, 1)
})

test("provider failure remains a visible partial state, never healthy or empty", () => {
  const model = new ExecutivePresenter().present(dto([{
    source: "assessments",
    kind: "failure",
    message: "Fonte temporariamente indisponível.",
  }]))
  const html = renderToStaticMarkup(<ExecutiveHome data={model} />)

  assert.equal(model.dataStatus, "partial")
  assert.equal(model.brief.status, "partial")
  assert.equal(model.isEmpty, false)
  assert.match(html, /Dados parciais/)
  assert.match(html, /Avaliações/)
  assert.doesNotMatch(html, /Organização saudável/)
})

test("legitimate unavailable context remains distinct from a read failure", () => {
  const model = new ExecutivePresenter().present(dto([{
    source: "workspace_unavailable",
    kind: "unavailable",
    message: "Nenhum workspace disponível.",
  }]))
  const html = renderToStaticMarkup(<ExecutiveHome data={model} />)

  assert.match(html, /Workspace de Planning — Indisponível/)
  assert.doesNotMatch(html, /Workspace de Planning — Falha de leitura/)
})

test("unfinished Jornada 6 capabilities remain explicitly unavailable", () => {
  const html = renderToStaticMarkup(
    <ExecutiveHome data={new ExecutivePresenter().present(dto())} />,
  )

  for (const capability of [
    "Turnover",
    "Clima",
    "Desempenho agregado",
    "Potencial e Nine Box",
    "Sucessão",
    "Planos estratégicos",
  ]) {
    assert.match(html, new RegExp(capability))
  }
  assert.match(html, /Indisponível/)
})
