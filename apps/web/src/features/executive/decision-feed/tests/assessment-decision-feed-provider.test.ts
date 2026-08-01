import assert from "node:assert/strict"
import test from "node:test"

import type { AssessmentExecutiveDashboard } from "@/features/assessments/types/assessment-executive-dashboard"

import {
  AssessmentDecisionFeedProvider,
  type AssessmentExecutiveDashboardSource,
} from "../adapters"

const generatedAt = "2026-08-01T12:00:00.000Z"

function createSource(
  dashboard: AssessmentExecutiveDashboard,
): AssessmentExecutiveDashboardSource {
  return {
    async load() {
      return dashboard
    },
  }
}

function createAssessment(
  overrides: Partial<
    AssessmentExecutiveDashboard["assessments"][number]
  > = {},
): AssessmentExecutiveDashboard["assessments"][number] {
  return {
    id: "assessment-1",
    title: "Avaliação de Liderança",
    description: null,
    status: "active",
    statusLabel: "Em andamento",
    typeLabel: "Competências",
    periodLabel: "01/08/2026 a 31/08/2026",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    templateId: "template-1",
    isAnonymous: false,
    evaluatorFormats: ["Gestor"],
    ...overrides,
  }
}

function createDashboard(
  overrides: Partial<AssessmentExecutiveDashboard> = {},
): AssessmentExecutiveDashboard {
  return {
    assessments: [],
    summary: {
      total: 0,
      draft: 0,
      scheduled: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
    },
    activeAssessments: [],
    scheduledAssessments: [],
    cancelledAssessments: [],
    ...overrides,
  }
}

test("retorna feed vazio quando não existem sinais executivos", async () => {
  const provider = new AssessmentDecisionFeedProvider(
    generatedAt,
    createSource(createDashboard()),
  )

  const feed = await provider.load()

  assert.equal(feed.generatedAt, generatedAt)
  assert.deepEqual(feed.items, [])
})

test("converte avaliação ativa em item do feed", async () => {
  const assessment = createAssessment()

  const provider = new AssessmentDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard({
        assessments: [assessment],
        summary: {
          total: 1,
          draft: 0,
          scheduled: 0,
          active: 1,
          completed: 0,
          cancelled: 0,
        },
        activeAssessments: [assessment],
      }),
    ),
  )

  const feed = await provider.load()
  const item = feed.items[0]

  assert.equal(item?.source, "assessment")
  assert.equal(item?.category, "people")
  assert.equal(
    item?.title,
    "Avaliação em andamento: Avaliação de Liderança",
  )
  assert.equal(
    item?.href,
    "/app/assessments/cycles/assessment-1",
  )
})

test("converte avaliação agendada em recomendação", async () => {
  const assessment = createAssessment({
    status: "scheduled",
    statusLabel: "Agendada",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    periodLabel: "01/09/2026 a 30/09/2026",
  })

  const provider = new AssessmentDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard({
        assessments: [assessment],
        summary: {
          total: 1,
          draft: 0,
          scheduled: 1,
          active: 0,
          completed: 0,
          cancelled: 0,
        },
        scheduledAssessments: [assessment],
      }),
    ),
  )

  const feed = await provider.load()
  const item = feed.items[0]

  assert.equal(item?.category, "recommendation")
  assert.equal(item?.priority, "medium")
})

test("gera alerta agregado para avaliações canceladas", async () => {
  const provider = new AssessmentDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard({
        summary: {
          total: 3,
          draft: 0,
          scheduled: 0,
          active: 0,
          completed: 1,
          cancelled: 2,
        },
      }),
    ),
  )

  const feed = await provider.load()
  const item = feed.items[0]

  assert.equal(item?.id, "assessments:cancelled")
  assert.equal(item?.category, "alert")
  assert.equal(item?.priority, "medium")
  assert.equal(item?.occurredAt, generatedAt)
})

test("não gera alerta quando não existem avaliações canceladas", async () => {
  const provider = new AssessmentDecisionFeedProvider(
    generatedAt,
    createSource(createDashboard()),
  )

  const feed = await provider.load()

  assert.deepEqual(feed.items, [])
})
