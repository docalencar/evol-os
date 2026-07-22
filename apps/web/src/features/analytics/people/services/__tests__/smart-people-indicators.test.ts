import assert from "node:assert/strict"
import test from "node:test"

import { presentSmartPeopleIndicators } from "../../presenters/present-smart-people-indicators"
import { compareIndicatorValues } from "../../policies/compare-indicator-values"
import {
  getSmartIndicatorStatus,
  SIGNIFICANT_DETERIORATION_PERCENTAGE,
} from "../../policies/get-smart-indicator-status"
import { calculateAverageDurationInDays } from "../calculate-average-duration"
import { calculateHires } from "../calculate-hires"
import {
  createMonthPeriods,
  isDateInPeriod,
} from "../create-month-periods"
import { calculateTurnover } from "../calculate-turnover"

const julyPeriods = createMonthPeriods(
  new Date("2026-07-22T12:00:00.000Z")
)

test("cria os períodos atual e anterior com fim exclusivo", () => {
  assert.equal(
    julyPeriods.current.start.toISOString(),
    "2026-07-01T00:00:00.000Z"
  )
  assert.equal(
    julyPeriods.current.endExclusive.toISOString(),
    "2026-08-01T00:00:00.000Z"
  )
  assert.equal(
    julyPeriods.previous.start.toISOString(),
    "2026-06-01T00:00:00.000Z"
  )
  assert.equal(
    julyPeriods.previous.endExclusive.toISOString(),
    "2026-07-01T00:00:00.000Z"
  )
})

test("trata transição de janeiro para dezembro", () => {
  const periods = createMonthPeriods(
    new Date("2026-01-15T00:00:00.000Z")
  )

  assert.equal(
    periods.previous.start.toISOString(),
    "2025-12-01T00:00:00.000Z"
  )
  assert.equal(
    periods.previous.endExclusive.toISOString(),
    "2026-01-01T00:00:00.000Z"
  )
})

test("inclui início e exclui o limite final do período", () => {
  assert.equal(
    isDateInPeriod(
      new Date("2026-07-01T00:00:00.000Z"),
      julyPeriods.current
    ),
    true
  )
  assert.equal(
    isDateInPeriod(
      new Date("2026-08-01T00:00:00.000Z"),
      julyPeriods.current
    ),
    false
  )
})

test("calcula turnover válido, zero e decimal", () => {
  assert.equal(
    calculateTurnover({
      terminations: 5,
      headcountAtStart: 100,
      headcountAtEnd: 100,
    }).value,
    5
  )
  assert.equal(
    calculateTurnover({
      terminations: 0,
      headcountAtStart: 10,
      headcountAtEnd: 10,
    }).value,
    0
  )
  assert.equal(
    calculateTurnover({
      terminations: 1,
      headcountAtStart: 10,
      headcountAtEnd: 12,
    }).value,
    100 / 11
  )
})

test("torna turnover indisponível sem histórico ou headcount médio", () => {
  assert.equal(
    calculateTurnover({
      terminations: 1,
      headcountAtStart: null,
      headcountAtEnd: 10,
    }).value,
    null
  )
  assert.equal(
    calculateTurnover({
      terminations: 0,
      headcountAtStart: 0,
      headcountAtEnd: 0,
    }).value,
    null
  )
})

test("calcula duração média em dias corridos", () => {
  assert.equal(
    calculateAverageDurationInDays(
      [
        {
          startedAt: new Date("2026-06-30T00:00:00Z"),
          completedAt: new Date("2026-07-10T00:00:00Z"),
        },
        {
          startedAt: new Date("2026-07-10T00:00:00Z"),
          completedAt: new Date("2026-07-14T00:00:00Z"),
        },
      ],
      julyPeriods.current
    ),
    7
  )
})

test("ignora duração incompleta, negativa e fora do período", () => {
  assert.equal(
    calculateAverageDurationInDays(
      [
        { startedAt: null, completedAt: new Date("2026-07-03") },
        { startedAt: new Date("2026-07-04"), completedAt: null },
        {
          startedAt: new Date("2026-07-10"),
          completedAt: new Date("2026-07-09"),
        },
        {
          startedAt: new Date("2026-05-01"),
          completedAt: new Date("2026-06-01"),
        },
      ],
      julyPeriods.current
    ),
    null
  )
  assert.equal(
    calculateAverageDurationInDays([], julyPeriods.current),
    null
  )
})

test("conta admissões dentro do período, inclusive desligadas depois", () => {
  assert.equal(
    calculateHires(
      [
        { hireDate: "2026-07-01", status: "active" },
        { hireDate: "2026-07-31", status: "terminated" },
        { hireDate: "2026-06-30", status: "active" },
        { hireDate: "2026-08-01", status: "active" },
      ],
      julyPeriods.current
    ),
    2
  )
  assert.equal(calculateHires([], julyPeriods.current), 0)
})

test("ignora data ou status inválido em admissões", () => {
  assert.equal(
    calculateHires(
      [
        { hireDate: "inválida", status: "active" },
        {
          hireDate: "2026-07-10",
          status: "unknown" as "active",
        },
      ],
      julyPeriods.current
    ),
    0
  )
})

test("compara aumento, redução e estabilidade", () => {
  assert.deepEqual(
    compareIndicatorValues(12, 10, "absolute"),
    { trend: "up", variation: 2 }
  )
  assert.deepEqual(
    compareIndicatorValues(8, 10, "relative"),
    { trend: "down", variation: -20 }
  )
  assert.deepEqual(
    compareIndicatorValues(10, 10, "relative"),
    { trend: "stable", variation: 0 }
  )
})

test("protege comparação contra zero, ausência, NaN e Infinity", () => {
  assert.deepEqual(
    compareIndicatorValues(2, 0, "relative"),
    { trend: "up", variation: null }
  )
  assert.deepEqual(
    compareIndicatorValues(0, 0, "relative"),
    { trend: "stable", variation: 0 }
  )
  assert.deepEqual(
    compareIndicatorValues(null, 2, "relative"),
    { trend: "unavailable", variation: null }
  )
  assert.equal(
    Number.isFinite(
      compareIndicatorValues(
        Number.POSITIVE_INFINITY,
        1,
        "relative"
      ).variation
    ),
    false
  )
})

test("política cobre healthy, warning, critical e unavailable", () => {
  assert.equal(
    getSmartIndicatorStatus({
      available: true,
      lowerIsBetter: true,
      trend: "down",
      relativeVariation: -10,
    }),
    "healthy"
  )
  assert.equal(
    getSmartIndicatorStatus({
      available: true,
      lowerIsBetter: true,
      trend: "up",
      relativeVariation: 10,
    }),
    "warning"
  )
  assert.equal(
    getSmartIndicatorStatus({
      available: true,
      lowerIsBetter: true,
      trend: "up",
      relativeVariation:
        SIGNIFICANT_DETERIORATION_PERCENTAGE,
    }),
    "critical"
  )
  assert.equal(
    getSmartIndicatorStatus({
      available: false,
      lowerIsBetter: true,
      trend: "unavailable",
      relativeVariation: null,
    }),
    "unavailable"
  )
})

test("presenter formata percentual, dias, contagem e indisponibilidade", () => {
  const viewModel = presentSmartPeopleIndicators({
    periodLabel: "vs. mês anterior",
    indicators: [
      {
        id: "turnover",
        valueKind: "percentage",
        value: 2.5,
        previousValue: 2,
        status: "warning",
        trend: "up",
        variation: 25,
        unavailableReason: null,
        availabilityReason: null,
      },
      {
        id: "average_approval_time",
        valueKind: "days",
        value: 1,
        previousValue: 2,
        status: "healthy",
        trend: "down",
        variation: -50,
        unavailableReason: null,
        availabilityReason: null,
      },
      {
        id: "hires",
        valueKind: "count",
        value: 3,
        previousValue: 1,
        status: "healthy",
        trend: "up",
        variation: 2,
        unavailableReason: null,
        availabilityReason: null,
      },
      {
        id: "average_time_to_hire",
        valueKind: "days",
        value: null,
        previousValue: null,
        status: "unavailable",
        trend: "unavailable",
        variation: null,
        unavailableReason: "Dado ausente.",
        availabilityReason: "unsupported",
      },
    ],
  })

  assert.equal(viewModel.indicators[0].formattedValue, "2,5%")
  assert.equal(viewModel.indicators[0].formattedVariation, "+25%")
  assert.equal(viewModel.indicators[1].formattedValue, "1 dia")
  assert.equal(viewModel.indicators[1].formattedVariation, "-50%")
  assert.equal(viewModel.indicators[2].formattedValue, "3")
  assert.equal(viewModel.indicators[2].formattedVariation, "+2")
  assert.equal(
    viewModel.indicators[3].formattedValue,
    "Indisponível"
  )
  assert.equal(viewModel.indicators[3].insight, "Dado ausente.")
})
