import assert from "node:assert/strict"
import test from "node:test"

import {
  PlanningScenario,
} from "../../../domain/planning-scenario"
import {
  PublishedSnapshot,
} from "../../../domain/published-snapshot"
import {
  createEmptyProjectedOrganization,
} from "../projection-contracts"
import {
  toProjectionContract,
} from "../to-projection-contract"
import type {
  ProjectionResult,
} from "../../result/projection-result"

const companyId = "company-1"
const workspaceId = "workspace-1"
const scenarioId = "scenario-1"
const snapshotId = "snapshot-1"
const projectionId = "projection-1"

const scenario =
  PlanningScenario.restore({
    id: scenarioId,
    companyId,
    workspaceId,
    baseSnapshotId: snapshotId,
    name: "Expansão 2027",
    description:
      "Cenário de expansão organizacional.",
    status: "draft",
    version: 1,
    createdAt:
      new Date(
        "2026-07-01T10:00:00.000Z"
      ),
    updatedAt:
      new Date(
        "2026-07-01T10:00:00.000Z"
      ),
  })

const snapshot =
  PublishedSnapshot.restore({
    id: snapshotId,
    companyId,
    workspaceId,
    sourceScenarioId: null,
    version: 1,
    publishedAt:
      new Date(
        "2026-06-30T10:00:00.000Z"
      ),
  })

const warning =
  Object.freeze({
    code: "employee.manager_missing",
    message:
      "O gestor informado não foi encontrado.",
    changeSetId: "change-set-1",
  })

const error =
  Object.freeze({
    code: "position.not_found",
    message:
      "O cargo informado não foi encontrado.",
    changeSetId: "change-set-2",
  })

const organization =
  createEmptyProjectedOrganization()

const projection =
  Object.freeze({
    organization,
    warnings:
      Object.freeze([
        warning,
      ]),
    errors:
      Object.freeze([
        error,
      ]),
    metrics:
      organization.metrics,
    isValid: false,
  }) as ProjectionResult

function createContract() {
  return toProjectionContract({
    id: projectionId,
    version: 3,
    scenario,
    snapshot,
    projection,
    engineVersion: "1.0.0",
    schemaVersion: "1.0.0",
    changeSetCount: 5,
    executedChangeSets: 4,
    durationMs: 42.5,
    occurredAt:
      new Date(
        "2026-07-20T14:30:00.000Z"
      ),
  })
}

test(
  "toProjectionContract mapeia a projeção para o contrato persistente",
  () => {
    const result =
      createContract()

    assert.equal(
      result.id,
      projectionId
    )

    assert.equal(
      result.companyId,
      companyId
    )

    assert.equal(
      result.workspaceId,
      workspaceId
    )

    assert.equal(
      result.scenarioId,
      scenarioId
    )

    assert.equal(
      result.sourceSnapshotId,
      snapshotId
    )

    assert.equal(
      result.version,
      3
    )

    assert.equal(
      result.status,
      "completed"
    )

    assert.equal(
      result.organization,
      organization
    )

    assert.equal(
      result.metrics,
      organization.metrics
    )

    assert.deepEqual(
      result.warnings,
      [
        warning,
      ]
    )

    assert.deepEqual(
      result.errors,
      [
        error,
      ]
    )
  }
)

test(
  "toProjectionContract cria o manifesto da execução",
  () => {
    const result =
      createContract()

    assert.deepEqual(
      result.manifest,
      {
        projectionVersion: 3,
        engineVersion: "1.0.0",
        schemaVersion: "1.0.0",
        changeSetCount: 5,
        executedChangeSets: 4,
        warningCount: 1,
        errorCount: 1,
        durationMs: 42.5,
        generatedAt:
          new Date(
            "2026-07-20T14:30:00.000Z"
          ),
      }
    )
  }
)

test(
  "toProjectionContract cria datas independentes da data recebida",
  () => {
    const occurredAt =
      new Date(
        "2026-07-20T14:30:00.000Z"
      )

    const result =
      toProjectionContract({
        id: projectionId,
        version: 3,
        scenario,
        snapshot,
        projection,
        engineVersion: "1.0.0",
        schemaVersion: "1.0.0",
        changeSetCount: 5,
        executedChangeSets: 4,
        durationMs: 42.5,
        occurredAt,
      })

    assert.deepEqual(
      result.manifest.generatedAt,
      occurredAt
    )

    assert.deepEqual(
      result.createdAt,
      occurredAt
    )

    assert.deepEqual(
      result.updatedAt,
      occurredAt
    )

    assert.notEqual(
      result.manifest.generatedAt,
      occurredAt
    )

    assert.notEqual(
      result.createdAt,
      occurredAt
    )

    assert.notEqual(
      result.updatedAt,
      occurredAt
    )

    assert.notEqual(
      result.createdAt,
      result.updatedAt
    )

    assert.notEqual(
      result.createdAt,
      result.manifest.generatedAt
    )
  }
)

test(
  "toProjectionContract cria contrato e coleções imutáveis",
  () => {
    const result =
      createContract()

    assert.equal(
      Object.isFrozen(result),
      true
    )

    assert.equal(
      Object.isFrozen(
        result.manifest
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result.warnings
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result.errors
      ),
      true
    )

    assert.notEqual(
      result.warnings,
      projection.warnings
    )

    assert.notEqual(
      result.errors,
      projection.errors
    )
  }
)
