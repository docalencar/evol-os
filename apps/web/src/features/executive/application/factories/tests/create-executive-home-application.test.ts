import assert from "node:assert/strict"
import test from "node:test"

import type { ExecutiveHomeDTO } from "../../../types"
import { createExecutiveHomeApplication } from "../create-executive-home-application"

const generatedAt = "2026-08-01T12:00:00.000Z"

test("cria a aplicação e delega uma única leitura", async () => {
  let leituras = 0

  const dto = createDTO()

  const application =
    createExecutiveHomeApplication({
      async load() {
        leituras += 1
        return dto
      },
    })

  const result =
    await application.execute()

  assert.equal(leituras, 1)

  assert.equal(
    result.brief.title,
    "Centro Executivo",
  )

  assert.equal(
    result.brief.status,
    "healthy",
  )

  assert.equal(
    result.decisionFeed.isEmpty,
    true,
  )
})

function createDTO(): ExecutiveHomeDTO {
  return Object.freeze({
    generatedAt,

    overview: Object.freeze({
      totalEmployees: 0,
      criticalEmployees: 0,
      organizationalRisks: 0,
      aiSuggestions: 0,
    }),

    dashboard: Object.freeze({
      title: "Executive Dashboard",
      subtitle: "Visão consolidada da empresa",
      generatedAtLabel: "01/08/2026, 09:00",
      isEmpty: true,

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

      alerts: Object.freeze([]),
    }),

    decisionFeed: Object.freeze({
      generatedAt,
      items: Object.freeze([]),
    }),
  })
}