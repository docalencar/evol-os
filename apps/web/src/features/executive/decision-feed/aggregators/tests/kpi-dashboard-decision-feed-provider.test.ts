import assert from "node:assert/strict"
import test from "node:test"

import type { KPIDashboardViewModel } from "@/features/kpi-dashboard/types"

import { KPIDashboardDecisionFeedProvider } from "../../adapters"

const generatedAt = "2026-08-01T12:00:00.000Z"

const dashboard = Object.freeze({
  title: "Executive Dashboard",
  subtitle: "Visão executiva",
  generatedAtLabel: "01/08/2026, 09:00",
  isEmpty: false,
  summary: Object.freeze([]),
  execution: Object.freeze([]),
  planning: Object.freeze([]),
  planningContext: Object.freeze({
    currentScenario: "Atual",
    baseScenario: "Baseline",
  }),
  health: Object.freeze([]),
  workers: Object.freeze([]),
  timeline: Object.freeze([]),
  alerts: Object.freeze([
    "Indicador crítico fora da meta.",
  ]),
}) satisfies KPIDashboardViewModel

test("provider converte o KPI Dashboard em Decision Feed", async () => {
  const provider = new KPIDashboardDecisionFeedProvider(
    dashboard,
    generatedAt,
  )

  const feed = await provider.load()

  assert.equal(provider.key, "kpi-dashboard")
  assert.equal(feed.generatedAt, generatedAt)
  assert.equal(feed.items.length, 1)
  assert.equal(feed.items[0]?.source, "kpi")
  assert.equal(feed.items[0]?.category, "alert")
  assert.equal(
    feed.items[0]?.description,
    "Indicador crítico fora da meta.",
  )
})

test("provider retorna feed vazio quando não existem alertas ou timeline", async () => {
  const provider = new KPIDashboardDecisionFeedProvider(
    {
      ...dashboard,
      isEmpty: true,
      alerts: [],
    },
    generatedAt,
  )

  const feed = await provider.load()

  assert.deepEqual(feed.items, [])
})