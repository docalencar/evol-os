import assert from "node:assert/strict"
import test from "node:test"

import { PlanningScenario } from "../../domain/planning-scenario"
import { PublishedSnapshot } from "../../domain/published-snapshot"
import type { PlanningScenarioStatus } from "../../types/planning-contracts"
import { PlanningTimelinePresenter } from "../presentation/planning-timeline-presenter"
import { PlanningTimelineService } from "./planning-timeline-service"

const companyId = "company-1"
const workspaceId = "workspace-1"
const anotherWorkspaceId = "workspace-2"

test("returns an immutable empty timeline", async () => {
  const service = createService([], [])

  const result = await service.execute({ workspaceId })

  assert.deepEqual(result, {
    workspaceId,
    items: [],
    isEmpty: true,
  })
  assertDeepFrozen(result)
})

test("presents one scenario as the current timeline item", async () => {
  const scenario = createScenario({
    id: "scenario-1",
    name: "Crescimento regional",
    status: "draft",
    version: 1,
    createdAt: "2026-07-01T10:00:00.000Z",
  })
  const service = createService([scenario], [createBaselineSnapshot()])

  const result = await service.execute({ workspaceId })

  assert.equal(result.isEmpty, false)
  assert.equal(result.items.length, 1)
  assert.deepEqual(result.items[0], {
    id: "scenario-1",
    version: 1,
    name: "Crescimento regional",
    status: "draft",
    statusLabel: "Rascunho",
    createdAt: "2026-07-01T10:00:00.000Z",
    createdAtLabel: "1 de jul. de 2026, 10:00",
    updatedAt: "2026-07-01T10:00:00.000Z",
    updatedAtLabel: "1 de jul. de 2026, 10:00",
    publishedAt: null,
    publishedAtLabel: null,
    author: null,
    baselineVersion: 1,
    baselineVersionLabel: "Snapshot v1",
    summary: "Crescimento regional está rascunho na versão 1.",
    badges: [
      { id: "status", label: "Rascunho", color: "slate" },
      { id: "current", label: "Atual", color: "blue" },
    ],
    current: true,
    published: false,
  })
  assertDeepFrozen(result)
})

test("orders multiple scenarios chronologically and isolates the requested Workspace", async () => {
  const scenarios = [
    createScenario({
      id: "scenario-c",
      name: "Terceiro",
      status: "approved",
      version: 3,
      createdAt: "2026-07-03T10:00:00.000Z",
    }),
    createScenario({
      id: "scenario-other",
      name: "Outro workspace",
      status: "draft",
      version: 1,
      createdAt: "2026-07-04T10:00:00.000Z",
      workspaceId: anotherWorkspaceId,
    }),
    createScenario({
      id: "scenario-a",
      name: "Primeiro",
      status: "published",
      version: 4,
      createdAt: "2026-07-01T10:00:00.000Z",
    }),
    createScenario({
      id: "scenario-b",
      name: "Segundo",
      status: "submitted",
      version: 2,
      createdAt: "2026-07-02T10:00:00.000Z",
    }),
  ]
  const snapshots = [
    createBaselineSnapshot(),
    createPublishedSnapshot("scenario-a", "2026-07-05T15:00:00.000Z"),
  ]
  const service = createService(scenarios, snapshots)

  const result = await service.execute({ workspaceId })

  assert.deepEqual(result.items.map((item) => item.id), [
    "scenario-a",
    "scenario-b",
    "scenario-c",
  ])
  assert.deepEqual(result.items.map((item) => item.current), [false, false, true])
  assert.equal(result.items[0]?.published, true)
  assert.equal(result.items[0]?.publishedAt, "2026-07-05T15:00:00.000Z")
  assert.equal(result.items[0]?.publishedAtLabel, "5 de jul. de 2026, 15:00")
  assert.deepEqual(result.items[0]?.badges, [
    { id: "status", label: "Publicado", color: "blue" },
    { id: "published", label: "Publicado", color: "green" },
  ])
})

test("uses deterministic tie-breaking and does not mutate source entities", async () => {
  const scenarios = [
    createScenario({
      id: "scenario-b",
      name: "B",
      status: "draft",
      version: 1,
      createdAt: "2026-07-01T10:00:00.000Z",
    }),
    createScenario({
      id: "scenario-a",
      name: "A",
      status: "draft",
      version: 1,
      createdAt: "2026-07-01T10:00:00.000Z",
    }),
  ]
  const snapshots = [createBaselineSnapshot()]
  const scenarioContractsBefore = scenarios.map((scenario) => scenario.toContract())
  const snapshotContractsBefore = snapshots.map((snapshot) => snapshot.toContract())
  const service = createService(scenarios, snapshots)

  const first = await service.execute({ workspaceId })
  const second = await service.execute({ workspaceId })

  assert.deepEqual(first, second)
  assert.deepEqual(first.items.map((item) => item.id), ["scenario-a", "scenario-b"])
  assert.deepEqual(
    scenarios.map((scenario) => scenario.toContract()),
    scenarioContractsBefore
  )
  assert.deepEqual(
    snapshots.map((snapshot) => snapshot.toContract()),
    snapshotContractsBefore
  )
  assertDeepFrozen(first)
})

test("delegates only the presented timeline contract to the presenter", async () => {
  let presenterCalls = 0
  const presenter = PlanningTimelinePresenter.create()
  const service = new PlanningTimelineService({
    companyId,
    scenarios: { async findAllByCompany() { return [] } },
    snapshots: { async findAllByCompany() { return [] } },
    presenter: {
      present(timeline) {
        presenterCalls += 1
        assert.equal(Object.isFrozen(timeline), true)
        assert.equal(Object.isFrozen(timeline.items), true)
        return presenter.present(timeline)
      },
    },
  })

  await service.execute({ workspaceId })

  assert.equal(presenterCalls, 1)
})

function createService(
  scenarios: readonly PlanningScenario[],
  snapshots: readonly PublishedSnapshot[]
): PlanningTimelineService {
  return new PlanningTimelineService({
    companyId,
    scenarios: {
      async findAllByCompany(receivedCompanyId) {
        assert.equal(receivedCompanyId, companyId)
        return scenarios
      },
    },
    snapshots: {
      async findAllByCompany(receivedCompanyId) {
        assert.equal(receivedCompanyId, companyId)
        return snapshots
      },
    },
    presenter: PlanningTimelinePresenter.create(),
  })
}

function createScenario(input: Readonly<{
  id: string
  name: string
  status: PlanningScenarioStatus
  version: number
  createdAt: string
  workspaceId?: string
}>): PlanningScenario {
  const createdAt = new Date(input.createdAt)

  return PlanningScenario.restore({
    id: input.id,
    companyId,
    workspaceId: input.workspaceId ?? workspaceId,
    baseSnapshotId: "baseline-1",
    name: input.name,
    description: null,
    status: input.status,
    version: input.version,
    createdAt,
    updatedAt: new Date(createdAt.getTime()),
  })
}

function createBaselineSnapshot(): PublishedSnapshot {
  return PublishedSnapshot.bootstrap({
    id: "baseline-1",
    companyId,
    workspaceId,
    version: 1,
    publishedAt: new Date("2026-06-01T10:00:00.000Z"),
  })
}

function createPublishedSnapshot(
  sourceScenarioId: string,
  publishedAt: string
): PublishedSnapshot {
  return PublishedSnapshot.publish({
    id: `snapshot-${sourceScenarioId}`,
    companyId,
    workspaceId,
    sourceScenarioId,
    version: 2,
    publishedAt: new Date(publishedAt),
  })
}

function assertDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== "object") return
  assert.equal(Object.isFrozen(value), true)
  for (const nested of Object.values(value)) assertDeepFrozen(nested)
}
