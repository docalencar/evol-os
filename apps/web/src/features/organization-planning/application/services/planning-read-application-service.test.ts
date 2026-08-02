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
import {
  PlanningReadApplicationService,
} from "./planning-read-application-service"

const companyId = "company-1"
const scenarioId = "scenario-1"
const snapshotId = "snapshot-1"

const generatedAt =
  Date.parse(
    "2026-07-29T12:00:00.000Z",
  )

test("coordena projeção, comparação, insights e apresentação", async () => {
  const calls: string[] = []

  const scenario = createScenario()
  const snapshot = createSnapshot()
  const changeSets = createChangeSets()

  const execution =
    ScenarioExecutor
      .create(() => generatedAt)
      .execute({
        snapshot,
        scenario: scenario.toContract(),
        changeSets,
      })

  const comparator =
    ScenarioComparisonEngine.create()

  const insights =
    PlanningInsightsEngine.create()

  const comparisonPresenter =
    PlanningComparisonPresenter.create()

  const insightsPresenter =
    PlanningInsightsPresenter.create()

  const service =
    new PlanningReadApplicationService({
      projection: {
        async execute(
          receivedScenarioId,
        ) {
          calls.push("projection")

          assert.equal(
            receivedScenarioId,
            scenarioId,
          )

          return Object.freeze({
            scenario,
            snapshot,
            changeSets,
            execution,
          })
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
          calls.push(
            "comparisonPresenter",
          )

          return comparisonPresenter
            .present(input)
        },
      },

      insightsPresenter: {
        present(input) {
          calls.push(
            "insightsPresenter",
          )

          return insightsPresenter
            .present(input)
        },
      },
    })

  const first =
    await service.execute(scenarioId)

  const second =
    await service.execute(scenarioId)

  assert.deepEqual(
    calls.slice(0, 5),
    [
      "projection",
      "comparison",
      "insights",
      "comparisonPresenter",
      "insightsPresenter",
    ],
  )

  assert.deepEqual(first, second)

  assert.equal(
    first.scenario.id,
    scenarioId,
  )

  assert.equal(first.version, 3)

  assert.equal(
    first.generatedAt,
    "2026-07-29T12:00:00.000Z",
  )

  assert.equal(
    first.comparison.summary.totalChanges,
    1,
  )

  assert.equal(
    first.comparison.sections[0]
      ?.changes[0]?.entityLabel,
    "Produto",
  )

  assert.equal(
    first.insights.kpis.find(
      (kpi) =>
        kpi.id ===
        "departments_created",
    )?.value,
    1,
  )

  assertDeepFrozen(first)
})

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

function assertDeepFrozen(
  value: unknown,
  visited = new Set<object>(),
): void {
  if (
    typeof value !== "object" ||
    value === null ||
    visited.has(value)
  ) {
    return
  }

  visited.add(value)

  assert.equal(
    Object.isFrozen(value),
    true,
  )

  for (
    const nested of Object.values(value)
  ) {
    assertDeepFrozen(
      nested,
      visited,
    )
  }
}
