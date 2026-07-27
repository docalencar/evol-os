import type {
  PlanningScenario,
} from "../../domain/planning-scenario"
import type {
  PublishedSnapshot,
} from "../../domain/published-snapshot"
import type {
  ProjectionResult,
} from "../result/projection-result"
import type {
  ProjectionContract,
} from "./projection-persistence-contract"

export type ToProjectionContractInput =
  Readonly<{
    id: string
    version: number
    scenario: PlanningScenario
    snapshot: PublishedSnapshot
    projection: ProjectionResult
    engineVersion: string
    schemaVersion: string
    changeSetCount: number
    executedChangeSets: number
    durationMs: number
    occurredAt: Date
  }>

export function toProjectionContract(
  input: ToProjectionContractInput
): ProjectionContract {
  const generatedAt = new Date(
    input.occurredAt.getTime()
  )

  return Object.freeze({
    id: input.id,
    companyId: input.scenario.companyId,
    workspaceId: input.scenario.workspaceId,
    scenarioId: input.scenario.id,
    sourceSnapshotId: input.snapshot.id,
    version: input.version,
    status: "completed",
    organization:
      input.projection.organization,
    metrics:
      input.projection.metrics,
    warnings: Object.freeze([
      ...input.projection.warnings,
    ]),
    errors: Object.freeze([
      ...input.projection.errors,
    ]),
    manifest: Object.freeze({
      projectionVersion:
        input.version,
      engineVersion:
        input.engineVersion,
      schemaVersion:
        input.schemaVersion,
      changeSetCount:
        input.changeSetCount,
      executedChangeSets:
        input.executedChangeSets,
      warningCount:
        input.projection.warnings.length,
      errorCount:
        input.projection.errors.length,
      durationMs:
        input.durationMs,
      generatedAt,
    }),
    createdAt: new Date(
      generatedAt.getTime()
    ),
    updatedAt: new Date(
      generatedAt.getTime()
    ),
  })
}
