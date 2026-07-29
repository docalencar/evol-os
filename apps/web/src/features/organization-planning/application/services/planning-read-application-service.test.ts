import assert from "node:assert/strict"
import test from "node:test"

import { PlanningScenario } from "../../domain/planning-scenario"
import { PlanningInsightsEngine } from "../../planning-insights"
import {
  PlanningComparisonPresenter,
  PlanningInsightsPresenter,
} from "../../presentation"
import {
  createEmptyProjectedOrganization,
  type ProjectionSnapshot,
} from "../../projection/contracts"
import { ScenarioComparisonEngine } from "../../projection/comparison"
import { ScenarioExecutor } from "../../projection/execution"
import type { ChangeSet } from "../../types/planning-contracts"
import { PlanningApplicationError } from "../handlers/planning-handler-support"
import { PlanningReadApplicationService } from "./planning-read-application-service"

const companyId = "company-1"
const scenarioId = "scenario-1"
const snapshotId = "snapshot-1"
const generatedAt = Date.parse("2026-07-29T12:00:00.000Z")

test("orchestrates the complete deterministic read flow through injected dependencies", async () => {
  const calls: string[] = []
  const scenario = createScenario()
  const snapshot = createSnapshot()
  const changeSets = createChangeSets()
  const projector = ScenarioExecutor.create(() => generatedAt)
  const comparator = ScenarioComparisonEngine.create()
  const insights = PlanningInsightsEngine.create()
  const comparisonPresenter = PlanningComparisonPresenter.create()
  const insightsPresenter = PlanningInsightsPresenter.create()
  const service = new PlanningReadApplicationService({
    companyId,
    scenarios: {
      async findById(receivedCompanyId, receivedScenarioId) {
        calls.push("scenario")
        assert.equal(receivedCompanyId, companyId)
        assert.equal(receivedScenarioId, scenarioId)
        return scenario
      },
      async create() {},
      async save() {},
    },
    snapshots: {
      async findProjectionById(receivedCompanyId, receivedSnapshotId) {
        calls.push("snapshot")
        assert.equal(receivedCompanyId, companyId)
        assert.equal(receivedSnapshotId, snapshotId)
        return snapshot
      },
    },
    changeSets: {
      async create() {},
      async listPublishableByScenario(input) {
        calls.push("changeSets")
        assert.deepEqual(input, { companyId, scenarioId })
        return changeSets
      },
    },
    projector: {
      execute(input) {
        calls.push("projection")
        return projector.execute(input)
      },
    },
    comparator: {
      compare(input) {
        calls.push("comparison")
        return comparator.compare(input)
      },
    },
    insights: {
      analyze(input) {
        calls.push("insights")
        return insights.analyze(input)
      },
    },
    comparisonPresenter: {
      present(input) {
        calls.push("comparisonPresenter")
        return comparisonPresenter.present(input)
      },
    },
    insightsPresenter: {
      present(input) {
        calls.push("insightsPresenter")
        return insightsPresenter.present(input)
      },
    },
  })

  const first = await service.execute(scenarioId)
  const second = await service.execute(scenarioId)

  assert.deepEqual(calls.slice(0, 8), [
    "scenario",
    "snapshot",
    "changeSets",
    "projection",
    "comparison",
    "insights",
    "comparisonPresenter",
    "insightsPresenter",
  ])
  assert.deepEqual(first, second)
  assert.equal(first.scenario.id, scenarioId)
  assert.equal(first.scenario.createdAt, "2026-01-01T00:00:00.000Z")
  assert.equal(first.version, 3)
  assert.equal(first.generatedAt, "2026-07-29T12:00:00.000Z")
  assert.equal(first.comparison.summary.totalChanges, 1)
  assert.equal(first.comparison.sections[0]?.changes[0]?.entityLabel, "Produto")
  assert.equal(first.insights.kpis.find((kpi) => kpi.id === "departments_created")?.value, 1)
  assertDeepFrozen(first)
  assert.equal(snapshot.organization?.departments.length, 0)
  assert.equal(changeSets[0]?.payload.name, "Produto")
})

test("rejects a missing scenario before loading any other dependency", async () => {
  let snapshotCalls = 0
  const service = new PlanningReadApplicationService({
    ...createDependencies(),
    scenarios: {
      async findById() { return null },
      async create() {},
      async save() {},
    },
    snapshots: {
      async findProjectionById() {
        snapshotCalls += 1
        return createSnapshot()
      },
    },
  })

  await assert.rejects(
    service.execute(scenarioId),
    (error) => error instanceof PlanningApplicationError && error.code === "not_found" && error.message === "Cenário não encontrado."
  )
  assert.equal(snapshotCalls, 0)
})

test("rejects a missing base snapshot before projection", async () => {
  let projectionCalls = 0
  const dependencies = createDependencies()
  const service = new PlanningReadApplicationService({
    ...dependencies,
    snapshots: {
      async findProjectionById() { return null },
    },
    projector: {
      execute(input) {
        projectionCalls += 1
        return dependencies.projector.execute(input)
      },
    },
  })

  await assert.rejects(
    service.execute(scenarioId),
    (error) => error instanceof PlanningApplicationError && error.code === "not_found" && error.message === "Snapshot base não encontrado."
  )
  assert.equal(projectionCalls, 0)
})

function createDependencies() {
  const scenario = createScenario()
  const snapshot = createSnapshot()
  const changeSets = createChangeSets()
  return {
    companyId,
    scenarios: {
      async findById() { return scenario },
      async create() {},
      async save() {},
    },
    snapshots: {
      async findProjectionById() { return snapshot },
    },
    changeSets: {
      async create() {},
      async listPublishableByScenario() { return changeSets },
    },
    projector: ScenarioExecutor.create(() => generatedAt),
    comparator: ScenarioComparisonEngine.create(),
    insights: PlanningInsightsEngine.create(),
    comparisonPresenter: PlanningComparisonPresenter.create(),
    insightsPresenter: PlanningInsightsPresenter.create(),
  }
}

function createScenario(): PlanningScenario {
  return PlanningScenario.restore({
    id: scenarioId,
    companyId,
    workspaceId: "workspace-1",
    baseSnapshotId: snapshotId,
    name: "Cenário Produto",
    description: null,
    status: "draft",
    version: 3,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  })
}

function createSnapshot(): ProjectionSnapshot {
  return Object.freeze({
    id: snapshotId,
    companyId,
    workspaceId: "workspace-1",
    sourceScenarioId: null,
    version: 1,
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    kind: "baseline",
    organization: createEmptyProjectedOrganization(),
  })
}

function createChangeSets(): readonly ChangeSet[] {
  return Object.freeze([
    Object.freeze({
      id: "change-set-1",
      companyId,
      scenarioId,
      changeType: "department.create",
      version: 1,
      payload: Object.freeze({
        departmentId: "department-1",
        name: "Produto",
        code: null,
        description: null,
        parentDepartmentId: null,
      }),
    }),
  ])
}

function assertDeepFrozen(value: unknown, visited = new Set<object>()): void {
  if (typeof value !== "object" || value === null || visited.has(value)) return
  visited.add(value)
  assert.equal(Object.isFrozen(value), true)
  for (const nested of Object.values(value)) assertDeepFrozen(nested, visited)
}
