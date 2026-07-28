import assert from "node:assert/strict"
import test from "node:test"
import { PlanningScenario } from "../../domain/planning-scenario"
import { PublishedSnapshot } from "../../domain/published-snapshot"
import { ScenarioExecutor } from "../../projection/execution"
import type {
  ChangeSetApplicationRepository,
  ScenarioApplicationRepository,
  SnapshotApplicationRepository,
} from "../ports"
import { PlanningApplicationError } from "../handlers/planning-handler-support"
import {
  ScenarioComparisonApplicationService,
  ScenarioComparisonProjectionError,
} from "../services"
import type { ChangeSet } from "../../types/planning-contracts"

const companyId = "company-1"
const workspaceId = "workspace-1"
const snapshotId = "snapshot-1"
const scenarioId = "scenario-1"

function scenario() {
  return PlanningScenario.restore({
    id: scenarioId,
    companyId,
    workspaceId,
    baseSnapshotId: snapshotId,
    name: "Cenário",
    description: null,
    status: "draft",
    version: 1,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
  })
}

function snapshot(workspace = workspaceId) {
  return PublishedSnapshot.restore({
    id: snapshotId,
    companyId,
    workspaceId: workspace,
    sourceScenarioId: null,
    version: 1,
    publishedAt: new Date("2026-07-01T00:00:00.000Z"),
  })
}

function departmentChangeSet(): ChangeSet {
  return {
    id: "change-1",
    companyId,
    scenarioId,
    changeType: "department.create",
    payload: {
      departmentId: "department-1",
      name: "Produto",
      code: "PROD",
    },
    version: 1,
  }
}

class MemoryScenarioRepository implements ScenarioApplicationRepository {
  constructor(readonly value: PlanningScenario | null) {}

  async findById(company: string, id: string) {
    if (company !== companyId || id !== scenarioId) return null
    return this.value
  }

  async create() {}
  async save() {}
}

class MemorySnapshotRepository implements SnapshotApplicationRepository {
  constructor(readonly value: PublishedSnapshot | null) {}

  async findById(company: string, id: string) {
    if (company !== companyId || id !== snapshotId) return null
    return this.value
  }

  async create() {}
}

class MemoryChangeSetRepository implements ChangeSetApplicationRepository {
  calls: Readonly<{ companyId: string; scenarioId: string }>[] = []

  constructor(readonly values: readonly ChangeSet[]) {}

  async findByScenario(company: string, scenario: string) {
    this.calls.push({ companyId: company, scenarioId: scenario })
    return this.values
  }
}

test("ScenarioComparisonApplicationService orchestrates repositories through presenter", async () => {
  const changeSets = new MemoryChangeSetRepository([departmentChangeSet()])
  const service = new ScenarioComparisonApplicationService(
    new MemoryScenarioRepository(scenario()),
    new MemorySnapshotRepository(snapshot()),
    changeSets
  )

  const viewModel = await service.execute({ companyId, scenarioId })

  assert.equal(viewModel.departments.created[0]?.entity.name, "Produto")
  assert.equal(viewModel.summary.departments.created, 1)
  assert.equal(viewModel.summary.totalChanges, 1)
  assert.deepEqual(changeSets.calls, [{ companyId, scenarioId }])
  assert.doesNotThrow(() => JSON.stringify(viewModel))
  assert.equal("salaryMass" in viewModel.summary.metrics, false)
})

test("ScenarioComparisonApplicationService reports a missing scenario before loading dependencies", async () => {
  const changeSets = new MemoryChangeSetRepository([])
  const service = new ScenarioComparisonApplicationService(
    new MemoryScenarioRepository(null),
    new MemorySnapshotRepository(snapshot()),
    changeSets
  )

  await assert.rejects(
    service.execute({ companyId, scenarioId }),
    (error: unknown) =>
      error instanceof PlanningApplicationError && error.code === "not_found"
  )
  assert.equal(changeSets.calls.length, 0)
})

test("ScenarioComparisonApplicationService validates snapshot workspace relation", async () => {
  const service = new ScenarioComparisonApplicationService(
    new MemoryScenarioRepository(scenario()),
    new MemorySnapshotRepository(snapshot("workspace-other")),
    new MemoryChangeSetRepository([])
  )

  await assert.rejects(
    service.execute({ companyId, scenarioId }),
    (error: unknown) =>
      error instanceof PlanningApplicationError &&
      error.code === "invalid_relation"
  )
})

test("ScenarioComparisonApplicationService rejects invalid projection before comparison and presentation", async () => {
  const duplicate = departmentChangeSet()
  const duplicateChangeSets = [
    duplicate,
    { ...duplicate, payload: { ...duplicate.payload } },
  ]
  let comparisonCalls = 0
  let presenterCalls = 0
  const service = new ScenarioComparisonApplicationService(
    new MemoryScenarioRepository(scenario()),
    new MemorySnapshotRepository(snapshot()),
    new MemoryChangeSetRepository(duplicateChangeSets),
    {
      execute: (input) => ScenarioExecutor.create(() => 0).execute(input),
      compare: () => {
        comparisonCalls += 1
        throw new Error("Comparison não deveria ser chamado.")
      },
      present: () => {
        presenterCalls += 1
        throw new Error("Presenter não deveria ser chamado.")
      },
    }
  )

  await assert.rejects(
    service.execute({ companyId, scenarioId }),
    (error: unknown) => {
      assert.equal(error instanceof ScenarioComparisonProjectionError, true)

      if (!(error instanceof ScenarioComparisonProjectionError)) {
        return false
      }

      assert.equal(error.code, "scenario_comparison.projection_failed")
      assert.deepEqual(
        error.issues.map((issue) => issue.code),
        ["scenario.execution.duplicate_change_set_id"]
      )
      return true
    }
  )

  assert.equal(comparisonCalls, 0)
  assert.equal(presenterCalls, 0)
})
