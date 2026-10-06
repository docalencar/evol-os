import assert from "node:assert/strict"
import test from "node:test"

import { presentTurnoverAnalytics } from "./present-turnover-analytics"
import type { TurnoverAnalytics } from "../types/turnover-analytics"

const factual: TurnoverAnalytics = {
  status: "available",
  periods: [
    {
      periodKind: "closed",
      periodStart: "2026-08-01",
      periodEndExclusive: "2026-09-01",
      availability: "available",
      unavailableReason: null,
      turnoverPercent: 2.5,
      generatedAt: "2026-09-20T12:00:00Z",
      headcountAsOfAt: null,
    },
    {
      periodKind: "mtd",
      periodStart: "2026-09-01",
      periodEndExclusive: "2026-10-01",
      availability: "available",
      unavailableReason: null,
      turnoverPercent: 1.25,
      generatedAt: "2026-09-20T12:00:00Z",
      headcountAsOfAt: "2026-09-20T11:59:00Z",
    },
  ],
}

test("presents the previous month as closed and the current month explicitly as MTD", () => {
  const result = presentTurnoverAnalytics(factual)

  assert.equal(result.periods[0].label, "Mês anterior (fechado)")
  assert.equal(result.periods[0].value, "2,5%")
  assert.equal(result.periods[0].observationLabel, "Período civil encerrado")
  assert.equal(result.periods[1].label, "Mês atual (MTD)")
  assert.equal(result.periods[1].value, "1,25%")
  assert.match(result.periods[1].observationLabel, /Posição factual em/)
})

test("keeps incomplete coverage and null percentages unavailable instead of rendering zero", () => {
  const result = presentTurnoverAnalytics({
    status: "available",
    periods: [
      {
        ...factual.periods[0],
        availability: "unavailable",
        unavailableReason: "incomplete_coverage",
        turnoverPercent: null,
      },
      {
        ...factual.periods[1],
        turnoverPercent: null,
      },
    ],
  })

  for (const period of result.periods) {
    assert.equal(period.value, "Indisponível")
    assert.equal(period.isAvailable, false)
    assert.doesNotMatch(period.value, /^0([,.]0+)?%$/)
  }
})

test("boundary failure is explicit and does not become an empty or zero result", () => {
  const result = presentTurnoverAnalytics({ status: "unavailable", reason: "query_error" })
  assert.deepEqual(
    result.periods.map((period) => period.value),
    ["Indisponível", "Indisponível"]
  )
  assert.match(result.periods[0].message ?? "", /Não foi possível carregar/)
})
