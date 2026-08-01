import assert from "node:assert/strict"
import test from "node:test"

import type { ExecutiveContext } from "@/features/executive/context"
import type {
  PlanningTimelineInput,
  PlanningTimelineViewModel,
} from "@/features/organization-planning/timeline"

import {
  PlanningTimelineDecisionFeedProvider,
  type PlanningTimelineSource,
} from "../adapters"

const context: ExecutiveContext = {
  companyId: "company-1",
  workspaceId: "workspace-1",
  scenarioId: "scenario-1",
  generatedAt: "2026-08-01T12:00:00.000Z",
}

function createTimelineSource(
  timeline: PlanningTimelineViewModel,
): PlanningTimelineSource {
  return {
    async execute(input: PlanningTimelineInput) {
      assert.equal(input.workspaceId, "workspace-1")
      return timeline
    },
  }
}

test("retorna feed vazio quando não existe workspace", async () => {
  const provider =
    new PlanningTimelineDecisionFeedProvider(
      {
        ...context,
        workspaceId: null,
      },
      createTimelineSource({
        workspaceId: "workspace-1",
        isEmpty: true,
        items: [],
      }),
    )

  const feed = await provider.load()

  assert.deepEqual(feed.items, [])
})

test("converte timeline em decision feed", async () => {
  const provider =
    new PlanningTimelineDecisionFeedProvider(
      context,
      createTimelineSource({
        workspaceId: "workspace-1",
        isEmpty: false,
        items: [
          {
            id: "scenario-1",
            version: 3,
            name: "Expansão Nordeste",
            status: "draft",
            statusLabel: "Rascunho",
            createdAt: "2026-08-01T09:00:00.000Z",
            createdAtLabel: "",
            updatedAt: "2026-08-01T10:00:00.000Z",
            updatedAtLabel: "",
            publishedAt: null,
            publishedAtLabel: null,
            author: null,
            baselineVersion: 2,
            baselineVersionLabel: "v2",
            summary: "Novo cenário estratégico",
            badges: [
              {
                id: "draft",
                label: "Rascunho",
                color: "amber",
              },
            ],
            current: true,
            published: false,
          },
        ],
      }),
    )

  const feed = await provider.load()

  assert.equal(feed.items.length, 1)

  assert.deepEqual(feed.items[0], {
    id: "planning-scenario:scenario-1",
    source: "planning",
    category: "scenario",
    priority: "medium",
    title: "Cenário de planejamento: Expansão Nordeste",
    description: "Novo cenário estratégico",
    occurredAt: "2026-08-01T10:00:00.000Z",
    href: "/app/organization/planning/scenario-1",
    badges: [
      "Rascunho",
      "Rascunho",
    ],
  })
})