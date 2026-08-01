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

    competencyGaps: [],

    developmentPriorities: [],

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

test("converte prioridade alta em item crítico", async () => {
  const provider = new DevelopmentDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard({
        developmentPriorities: [
          {
            employeeId: "employee-1",
            employeeName: "Ana Souza",
            risk: "high",
            criticalGaps: 2,
            attentionGaps: 1,
            biggestGap: "Liderança",
          },
        ],
      }),
    ),
  )

  const feed = await provider.load()
  const item = feed.items[0]

  assert.equal(item?.source, "development")
  assert.equal(item?.category, "people")
  assert.equal(item?.priority, "critical")
  assert.equal(item?.title, "Desenvolvimento: Ana Souza")
  assert.equal(item?.href, "/app/people/employee-1")
})

test("converte prioridade média em item de prioridade alta", async () => {
  const provider = new DevelopmentDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard({
        developmentPriorities: [
          {
            employeeId: "employee-1",
            employeeName: "Carlos Lima",
            risk: "medium",
            criticalGaps: 0,
            attentionGaps: 3,
            biggestGap: null,
          },
        ],
      }),
    ),
  )

  const feed = await provider.load()

  assert.equal(feed.items[0]?.priority, "high")
})

test("ignora prioridades de baixo risco", async () => {
  const provider = new DevelopmentDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard({
        developmentPriorities: [
          {
            employeeId: "employee-1",
            employeeName: "Marina Alves",
            risk: "low",
            criticalGaps: 0,
            attentionGaps: 0,
            biggestGap: null,
          },
        ],
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

test("gera recomendação para o maior gap de competência", async () => {
  const provider = new DevelopmentDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard({
        competencyGaps: [
          {
            competencyId: "competency-1",
            competencyName: "Comunicação",
            averageGap: 1.5,
            worstGap: 2,
            affectedEmployees: 7,
          },
          {
            competencyId: "competency-2",
            competencyName: "Liderança",
            averageGap: 2.2,
            worstGap: 4,
            affectedEmployees: 3,
          },
        ],
      }),
    ),
  )

  const feed = await provider.load()
  const item = feed.items[0]

  assert.equal(
    item?.id,
    "development-competency-gap:competency-2",
  )
  assert.equal(item?.category, "recommendation")
  assert.equal(
    item?.title,
    "Gap de competência: Liderança",
  )
})

test("ignora gaps sem pessoas afetadas ou sem gap positivo", async () => {
  const provider = new DevelopmentDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard({
        competencyGaps: [
          {
            competencyId: "competency-1",
            competencyName: "Comunicação",
            averageGap: 0,
            worstGap: 0,
            affectedEmployees: 5,
          },
          {
            competencyId: "competency-2",
            competencyName: "Liderança",
            averageGap: 2,
            worstGap: 3,
            affectedEmployees: 0,
          },
        ],
      }),
    ),
  )

  const feed = await provider.load()

  assert.deepEqual(feed.items, [])
})
