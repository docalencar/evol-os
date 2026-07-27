import assert from "node:assert/strict"
import test from "node:test"

import {
  createEmptyProjectedOrganization,
  type ProjectionContract,
  type ProjectionMetrics,
} from "../../../projection"
import {
  createMetricDelta,
} from "../create-metric-delta"
import {
  createScenarioIntelligence,
} from "../create-scenario-intelligence"

const currentMetrics:
  ProjectionMetrics =
  Object.freeze({
    headcount: 100,
    vacancies: 12,
    salaryMass: 500_000,
    departments: 8,
    positions: 35,
  })

const projectedMetrics:
  ProjectionMetrics =
  Object.freeze({
    headcount: 112,
    vacancies: 9,
    salaryMass: 560_000,
    departments: 9,
    positions: 39,
  })

const generatedAt =
  new Date(
    "2026-07-27T18:00:00.000Z"
  )

function createProjection():
ProjectionContract {
  const emptyOrganization =
    createEmptyProjectedOrganization()

  return Object.freeze({
    id: "projection-1",
    companyId: "company-1",
    workspaceId:
      "workspace-1",
    scenarioId:
      "scenario-1",
    sourceSnapshotId:
      "snapshot-1",
    version: 3,
    status: "completed",

    organization:
      Object.freeze({
        ...emptyOrganization,
        metrics:
          projectedMetrics,
      }),

    metrics:
      projectedMetrics,

    warnings:
      Object.freeze([]),

    errors:
      Object.freeze([]),

    manifest:
      Object.freeze({
        projectionVersion: 3,
        engineVersion:
          "1.0.0",
        schemaVersion:
          "1.0.0",
        changeSetCount: 5,
        executedChangeSets: 5,
        warningCount: 0,
        errorCount: 0,
        durationMs: 18,
        generatedAt,
      }),

    createdAt:
      new Date(
        "2026-07-27T18:00:01.000Z"
      ),

    updatedAt:
      new Date(
        "2026-07-27T18:00:01.000Z"
      ),
  })
}

test(
  "createMetricDelta calcula aumento absoluto e percentual",
  () => {
    assert.deepEqual(
      createMetricDelta(
        100,
        112
      ),
      {
        current: 100,
        projected: 112,
        absolute: 12,
        percentage: 12,
        direction:
          "increase",
      }
    )
  }
)

test(
  "createMetricDelta calcula redução absoluta e percentual",
  () => {
    assert.deepEqual(
      createMetricDelta(
        12,
        9
      ),
      {
        current: 12,
        projected: 9,
        absolute: -3,
        percentage: -25,
        direction:
          "decrease",
      }
    )
  }
)

test(
  "createMetricDelta identifica valor inalterado",
  () => {
    assert.deepEqual(
      createMetricDelta(
        8,
        8
      ),
      {
        current: 8,
        projected: 8,
        absolute: 0,
        percentage: 0,
        direction:
          "unchanged",
      }
    )
  }
)

test(
  "createMetricDelta retorna percentual nulo quando a base é zero",
  () => {
    assert.deepEqual(
      createMetricDelta(
        0,
        5
      ),
      {
        current: 0,
        projected: 5,
        absolute: 5,
        percentage: null,
        direction:
          "increase",
      }
    )
  }
)

test(
  "createMetricDelta arredonda o percentual para duas casas",
  () => {
    assert.equal(
      createMetricDelta(
        350,
        382
      ).percentage,
      9.14
    )
  }
)

test(
  "createScenarioIntelligence compara o estado atual com a projeção",
  () => {
    const result =
      createScenarioIntelligence({
        currentMetrics,
        projection:
          createProjection(),
      })

    assert.deepEqual(
      result.workforce.headcount,
      {
        current: 100,
        projected: 112,
        absolute: 12,
        percentage: 12,
        direction:
          "increase",
      }
    )

    assert.deepEqual(
      result.vacancies.vacancies,
      {
        current: 12,
        projected: 9,
        absolute: -3,
        percentage: -25,
        direction:
          "decrease",
      }
    )

    assert.deepEqual(
      result.financial.salaryMass,
      {
        current: 500_000,
        projected: 560_000,
        absolute: 60_000,
        percentage: 12,
        direction:
          "increase",
      }
    )

    assert.deepEqual(
      result.organization.departments,
      {
        current: 8,
        projected: 9,
        absolute: 1,
        percentage: 12.5,
        direction:
          "increase",
      }
    )

    assert.deepEqual(
      result.organization.positions,
      {
        current: 35,
        projected: 39,
        absolute: 4,
        percentage: 11.43,
        direction:
          "increase",
      }
    )
  }
)

test(
  "createScenarioIntelligence preserva a identidade da projeção",
  () => {
    const result =
      createScenarioIntelligence({
        currentMetrics,
        projection:
          createProjection(),
      })

    assert.equal(
      result.projectionId,
      "projection-1"
    )

    assert.equal(
      result.scenarioId,
      "scenario-1"
    )

    assert.equal(
      result.projectionVersion,
      3
    )

    assert.deepEqual(
      result.generatedAt,
      generatedAt
    )

    assert.notEqual(
      result.generatedAt,
      generatedAt
    )
  }
)

test(
  "createScenarioIntelligence retorna uma estrutura imutável",
  () => {
    const result =
      createScenarioIntelligence({
        currentMetrics,
        projection:
          createProjection(),
      })

    assert.equal(
      Object.isFrozen(
        result
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result.workforce
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result.workforce
          .headcount
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result.vacancies
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result.financial
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result.organization
      ),
      true
    )
  }
)
