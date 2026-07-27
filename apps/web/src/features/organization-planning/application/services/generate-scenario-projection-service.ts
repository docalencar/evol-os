import { randomUUID } from "node:crypto"

import {
  toProjectionContract,
  type ProjectionContract,
} from "../../projection"
import type {
  ProjectionApplicationRepository,
  ProjectionVersionAllocator,
} from "../ports"
import type {
  ProjectScenarioService,
} from "./project-scenario-service"

export const PROJECTION_ENGINE_VERSION =
  "1.0.0"

export const PROJECTION_SCHEMA_VERSION =
  "1.0.0"

export type GenerateScenarioProjectionInput =
  Readonly<{
    companyId: string
    scenarioId: string
  }>

export type GenerateScenarioProjectionServiceDependencies =
  Readonly<{
    projectScenarioService:
      ProjectScenarioService
    projections:
      ProjectionApplicationRepository
    versionAllocator:
      ProjectionVersionAllocator
    generateId?: () => string
    now?: () => Date
    measureTime?: () => number
    engineVersion?: string
    schemaVersion?: string
  }>

export class GenerateScenarioProjectionService {
  private readonly generateId:
    () => string

  private readonly now:
    () => Date

  private readonly measureTime:
    () => number

  private readonly engineVersion:
    string

  private readonly schemaVersion:
    string

  constructor(
    private readonly projectScenarioService:
      ProjectScenarioService,
    private readonly projections:
      ProjectionApplicationRepository,
    private readonly versionAllocator:
      ProjectionVersionAllocator,
    generateId:
      () => string =
      randomUUID,
    now:
      () => Date =
      () => new Date(),
    measureTime:
      () => number =
      () => performance.now(),
    engineVersion:
      string =
      PROJECTION_ENGINE_VERSION,
    schemaVersion:
      string =
      PROJECTION_SCHEMA_VERSION
  ) {
    this.generateId =
      generateId
    this.now =
      now
    this.measureTime =
      measureTime
    this.engineVersion =
      engineVersion
    this.schemaVersion =
      schemaVersion
  }

  async execute(
    input:
      GenerateScenarioProjectionInput
  ): Promise<ProjectionContract> {
    const startedAt =
      this.measureTime()

    const execution =
      await this.projectScenarioService
        .executeWithContext({
          companyId:
            input.companyId,
          scenarioId:
            input.scenarioId,
        })

    const version =
      await this.versionAllocator.allocate(
        input.companyId,
        execution.scenario.id
      )

    const finishedAt =
      this.measureTime()

    const durationMs =
      Math.max(
        0,
        finishedAt - startedAt
      )

    const projection =
      toProjectionContract({
        id: this.generateId(),
        version,
        scenario:
          execution.scenario,
        snapshot:
          execution.snapshot,
        projection:
          execution.projection,
        engineVersion:
          this.engineVersion,
        schemaVersion:
          this.schemaVersion,
        changeSetCount:
          execution.changeSets.length,
        executedChangeSets:
          execution.changeSets.length,
        durationMs,
        occurredAt:
          this.now(),
      })

    await this.projections.create(
      projection
    )

    return projection
  }
}

export function createGenerateScenarioProjectionService(
  dependencies:
    GenerateScenarioProjectionServiceDependencies
) {
  return new GenerateScenarioProjectionService(
    dependencies.projectScenarioService,
    dependencies.projections,
    dependencies.versionAllocator,
    dependencies.generateId,
    dependencies.now,
    dependencies.measureTime,
    dependencies.engineVersion,
    dependencies.schemaVersion
  )
}
