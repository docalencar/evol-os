import assert from "node:assert/strict"
import test from "node:test"

import type { FeedbackExecutiveDashboard } from "@/features/feedbacks/types/feedback-executive-dashboard"
import type { FeedbackThread } from "@/features/feedbacks/types/feedback"

import {
  FeedbackDecisionFeedProvider,
  type FeedbackExecutiveDashboardSource,
} from "../adapters"

const generatedAt = "2026-08-01T12:00:00.000Z"

function createThread(
  overrides: Partial<FeedbackThread> = {},
): FeedbackThread {
  return {
    id: "feedback-1",
    companyId: "company-1",
    senderEmployeeId: "employee-1",
    receiverEmployeeId: "employee-2",
    createdByUserId: "user-1",
    assessmentId: null,
    developmentPlanId: null,
    competencyId: null,
    type: "feedback",
    status: "open",
    priority: "normal",
    visibility: "participants",
    title: "Alinhamento de comunicação",
    requiresFollowUp: false,
    followUpAt: null,
    acknowledgedAt: null,
    closedAt: null,
    createdAt: new Date("2026-07-20T12:00:00.000Z"),
    updatedAt: new Date("2026-07-25T12:00:00.000Z"),
    ...overrides,
  }
}

function createDashboard(
  threads: readonly FeedbackThread[],
): FeedbackExecutiveDashboard {
  return {
    threads,

    summary: {
      total: threads.length,
      open: threads.filter(
        (thread) => thread.status === "open",
      ).length,
      awaitingAcknowledgement: threads.filter(
        (thread) =>
          thread.status === "awaiting_acknowledgement",
      ).length,
      acknowledged: threads.filter(
        (thread) =>
          thread.status === "acknowledged",
      ).length,
      closed: threads.filter(
        (thread) => thread.status === "closed",
      ).length,
      archived: threads.filter(
        (thread) => thread.status === "archived",
      ).length,
      highPriority: threads.filter(
        (thread) => thread.priority === "high",
      ).length,
      pendingFollowUp: threads.filter(
        (thread) => thread.requiresFollowUp,
      ).length,
    },
  }
}

function createSource(
  dashboard: FeedbackExecutiveDashboard,
): FeedbackExecutiveDashboardSource {
  return {
    async load() {
      return dashboard
    },
  }
}

test("retorna feed vazio sem sinais executivos", async () => {
  const provider = new FeedbackDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard([
        createThread(),
      ]),
    ),
  )

  const feed = await provider.load()

  assert.deepEqual(feed.items, [])
})

test("converte confirmação pendente em prioridade alta", async () => {
  const provider = new FeedbackDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard([
        createThread({
          status: "awaiting_acknowledgement",
        }),
      ]),
    ),
  )

  const item = (await provider.load()).items[0]

  assert.equal(item?.source, "feedback")
  assert.equal(item?.category, "approval")
  assert.equal(item?.priority, "high")
})

test("converte acompanhamento atrasado em item crítico", async () => {
  const provider = new FeedbackDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard([
        createThread({
          requiresFollowUp: true,
          followUpAt: new Date(
            "2026-07-30T12:00:00.000Z",
          ),
        }),
      ]),
    ),
  )

  const item = (await provider.load()).items[0]

  assert.equal(item?.priority, "critical")
  assert.match(
    item?.title ?? "",
    /atrasado/,
  )
})

test("converte acompanhamento próximo em prioridade média", async () => {
  const provider = new FeedbackDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard([
        createThread({
          requiresFollowUp: true,
          followUpAt: new Date(
            "2026-08-05T12:00:00.000Z",
          ),
        }),
      ]),
    ),
  )

  const item = (await provider.load()).items[0]

  assert.equal(item?.category, "recommendation")
  assert.equal(item?.priority, "medium")
})

test("ignora conversas encerradas e arquivadas", async () => {
  const provider = new FeedbackDecisionFeedProvider(
    generatedAt,
    createSource(
      createDashboard([
        createThread({
          id: "closed",
          status: "closed",
          priority: "high",
        }),
        createThread({
          id: "archived",
          status: "archived",
          priority: "high",
        }),
      ]),
    ),
  )

  const feed = await provider.load()

  assert.deepEqual(feed.items, [])
})
