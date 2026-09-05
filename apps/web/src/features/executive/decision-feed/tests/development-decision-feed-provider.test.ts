import assert from "node:assert/strict"
import test from "node:test"

import type { DevelopmentExecutiveDashboard } from "@/features/development/types/development-executive-dashboard"

import {
  DevelopmentDecisionFeedProvider,
  type DevelopmentExecutiveDashboardSource,
} from "../adapters"

const generatedAt = "2026-08-01T12:00:00.000Z"

function createSource(
  dashboard: DevelopmentExecutiveDashboard,
): DevelopmentExecutiveDashboardSource {
  return {
    async load() {
      return dashboard
    },
  }
}

function createDashboard(
  overrides: Partial<DevelopmentExecutiveDashboard> = {},
): DevelopmentExecutiveDashboard {
  return {
    planList: {
      plans: [],
      owners: [],
    },

    kpis: {
      activePlans: 0,
      completedPlans: 0,
      cancelledPlans: 0,
      averageProgress: 0,
    },

    competencyDevelopment: {
      assessed: 0,
      unassessed: 0,
      deficiencies: 0,
      meets: 0,
      exceeds: 0,
      people: [],
      priorities: [],
    },

    planDistribution: [],

    monthlyEvolution: [],

    ...overrides,
  }
}

test("retorna feed vazio quando não existem sinais executivos", async () => {
  const provider = new DevelopmentDecisionFeedProvider(
    generatedAt,
    createSource(createDashboard()),
  )

  const feed = await provider.load()

  assert.equal(feed.generatedAt, generatedAt)
  assert.deepEqual(feed.items, [])
})

test("converte deficiência canônica em item factual de desenvolvimento", async () => {
  const provider = new DevelopmentDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard({
        competencyDevelopment: {
          assessed: 1,
          unassessed: 0,
          deficiencies: 1,
          meets: 0,
          exceeds: 0,
          people: [],
          priorities: [{
            personId: "employee-1",
            personName: "Ana Souza",
            competencyId: "competency-1",
            competencyName: "Liderança",
            expectedLevel: 4,
            currentLevel: 2,
            gap: 2,
            status: "deficiency",
          }],
        },
      }),
    ),
  )

  const feed = await provider.load()
  const item = feed.items[0]

  assert.equal(item?.source, "development")
  assert.equal(item?.category, "recommendation")
  assert.equal(item?.priority, "medium")
  assert.equal(item?.title, "Desenvolvimento: Ana Souza")
  assert.equal(item?.href, "/app/people/employee-1")
  assert.match(item?.description ?? "", /Liderança: deficiência de 2/)
})

test("não cria sinal executivo para atende, supera ou não avaliada", async () => {
  const provider = new DevelopmentDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard({
        competencyDevelopment: {
          assessed: 2,
          unassessed: 1,
          deficiencies: 0,
          meets: 1,
          exceeds: 1,
          people: [],
          priorities: [],
        },
      }),
    ),
  )

  const feed = await provider.load()

  assert.deepEqual(feed.items, [])
})

test("gera alerta agregado para planos cancelados", async () => {
  const provider = new DevelopmentDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard({
        kpis: {
          activePlans: 4,
          completedPlans: 2,
          cancelledPlans: 3,
          averageProgress: 56,
        },
      }),
    ),
  )

  const feed = await provider.load()
  const item = feed.items[0]

  assert.equal(item?.id, "development:cancelled-plans")
  assert.equal(item?.category, "alert")
  assert.equal(item?.priority, "medium")
  assert.equal(item?.occurredAt, generatedAt)
})
