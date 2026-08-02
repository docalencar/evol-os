import assert from "node:assert/strict"
import test from "node:test"

import { PlanningScenario } from "../../domain/planning-scenario"
import {
  createEmptyProjectedOrganization,
  type ProjectionSnapshot,
} from "../../projection/contracts"
import { ScenarioExecutor } from "../../projection/execution"
import type { ChangeSet } from "../../types/planning-contracts"
import {
  PlanningApplicationError,
  PlanningScenarioProjectionError,
} from "../handlers/planning-handler-support"
import {
  PlanningProjectionReadService,
} from "./planning-projection-read-service"

const companyId = "company-1"
const scenarioId = "scenario-1"
const snapshotId = "snapshot-1"

const generatedAt =
  Date.parse(
    "2026-07-29T12:00:00.000Z",
  )

test("carrega e executa uma projeção válida", async () => {
  const calls: string[] = []

  const service =
    new PlanningProjectionReadService({
      companyId,

      scenarios: {
        async findById(
          receivedCompanyId,
          receivedScenarioId,
        ) {
          calls.push("scenario")

          assert.equal(
            receivedCompanyId,
            companyId,
          )

          assert.equal(
            receivedScenarioId,
            scenarioId,
          )

          return createScenario()
        },

        async create() {},
        async save() {},
      },

      snapshots: {
        async findProjectionById(
          receivedCompanyId,
          receivedSnapshotId,
        ) {
          calls.push("snapshot")

          assert.equal(
            receivedCompanyId,
            companyId,
          )

          assert.equal(
            receivedSnapshotId,
            snapshotId,
          )

          return createSnapshot()
        },
      },

      changeSets: {
        async create() {},

        async listPublishableByScenario(
          input,
        ) {
          calls.push("changeSets")

          assert.deepEqual(input, {
            companyId,
            scenarioId,
          })

          return createChangeSets()
        },
      },

      projector: {
        execute(input) {
          calls.push("projection")

          return ScenarioExecutor
            .create(() => generatedAt)
            .execute(input)
        },
      },
    })

  const result =
    await service.execute(scenarioId)

  assert.deepEqual(calls, [
    "scenario",
    "snapshot",
    "changeSets",
    "projection",
  ])

  assert.equal(
    result.scenario.id,
    scenarioId,
  )

  assert.equal(
    result.snapshot.id,
    snapshotId,
  )

  assert.equal(
    result.execution.organization
      .departments[0]?.name,
    "Produto",
  )

  assert.equal(
    result.execution.generatedAt
      .toISOString(),
    "2026-07-29T12:00:00.000Z",
  )

  assert.equal(
    Object.isFrozen(result),
    true,
  )

  assert.equal(
    Object.isFrozen(result.changeSets),
    true,
  )
})

test("interrompe quando o cenário não existe", async () => {
  let snapshotCalls = 0

  const service =
    new PlanningProjectionReadService({
      ...createDependencies(),

      scenarios: {
        async findById() {
          return null
        },

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
    (error) =>
      error instanceof
        PlanningApplicationError &&
      error.code === "not_found" &&
      error.message ===
        "Cenário não encontrado.",
  )

  assert.equal(snapshotCalls, 0)
})

test("interrompe quando o snapshot não existe", async () => {
  let projectionCalls = 0

  const dependencies =
    createDependencies()

  const service =
    new PlanningProjectionReadService({
      ...dependencies,

      snapshots: {
        async findProjectionById() {
          return null
        },
      },

      projector: {
        execute(input) {
          projectionCalls += 1

          return dependencies.projector
            .execute(input)
        },
      },
    })

  await assert.rejects(
    service.execute(scenarioId),
    (error) =>
      error instanceof
        PlanningApplicationError &&
      error.code === "not_found" &&
      error.message ===
        "Snapshot base não encontrado.",
  )

  assert.equal(projectionCalls, 0)
})

test("rejeita snapshot sem organização persistida", async () => {
  const snapshot = {
    ...createSnapshot(),
    organization: undefined,
  } satisfies ProjectionSnapshot

  const service =
    new PlanningProjectionReadService({
      ...createDependencies(),

      snapshots: {
        async findProjectionById() {
          return snapshot
        },
      },
    })

  await assert.rejects(
    service.execute(scenarioId),
    (error) =>
      error instanceof
        PlanningScenarioProjectionError,
  )
})

function createDependencies() {
  return {
    companyId,

    scenarios: {
      async findById() {
        return createScenario()
      },

      async create() {},
      async save() {},
    },

    snapshots: {
      async findProjectionById() {
        return createSnapshot()
      },
    },

    changeSets: {
      async create() {},

      async listPublishableByScenario() {
        return createChangeSets()
      },
    },

    projector:
      ScenarioExecutor.create(
        () => generatedAt,
      ),
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
    createdAt:
      new Date(
        "2026-01-01T00:00:00.000Z",
      ),
    updatedAt:
      new Date(
        "2026-01-02T00:00:00.000Z",
      ),
  })
}

function createSnapshot(): ProjectionSnapshot {
  return Object.freeze({
    id: snapshotId,
    companyId,
    workspaceId: "workspace-1",
    sourceScenarioId: null,
    version: 1,
    publishedAt:
      new Date(
        "2026-01-01T00:00:00.000Z",
      ),
    kind: "baseline",
    organization:
      createEmptyProjectedOrganization(),
  })
}

function createChangeSets():
  readonly ChangeSet[] {
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
