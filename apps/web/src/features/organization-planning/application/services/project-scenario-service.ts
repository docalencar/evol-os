import {
  toProjectionChangeSets,
} from "../../change-sets/adapters/to-projection-change-set"
import type {
  PlanningChangeSet,
} from "../../change-sets"
import type {
  PlanningScenario,
} from "../../domain/planning-scenario"
import type {
  PublishedSnapshot,
} from "../../domain/published-snapshot"
import {
  ProjectionEngine,
} from "../../projection"
import type {
  ProjectionResult,
} from "../../projection"
import type {
  OrganizationSnapshot,
} from "../../snapshot"
import {
  PlanningApplicationError,
  requireApplicationEntity,
} from "../handlers/planning-handler-support"
import type {
  PlanningChangeSetApplicationRepository,
  ScenarioApplicationRepository,
  SnapshotApplicationRepository,
} from "../ports"

export type ProjectScenarioInput = Readonly<{
  companyId: string
  scenarioId: string
}>

export type ProjectScenarioExecution =
  Readonly<{
    scenario: PlanningScenario
    snapshot: PublishedSnapshot
    organizationSnapshot:
      OrganizationSnapshot
    changeSets:
      readonly PlanningChangeSet[]
    projection: ProjectionResult
  }>

export type ProjectScenarioServiceDependencies =
  Readonly<{
    scenarios:
      ScenarioApplicationRepository
    snapshots:
      SnapshotApplicationRepository
    changeSets:
      PlanningChangeSetApplicationRepository
    projectionEngine?: ProjectionEngine
  }>

export class ProjectScenarioService {
  private readonly projectionEngine:
    ProjectionEngine

  constructor(
    private readonly scenarios:
      ScenarioApplicationRepository,
    private readonly snapshots:
      SnapshotApplicationRepository,
    private readonly changeSets:
      PlanningChangeSetApplicationRepository,
    projectionEngine:
      ProjectionEngine =
      ProjectionEngine.create()
  ) {
    this.projectionEngine =
      projectionEngine
  }

  async execute(
    input: ProjectScenarioInput
  ): Promise<ProjectionResult> {
    const execution =
      await this.executeWithContext(input)

    return execution.projection
  }

  async executeWithContext(
    input: ProjectScenarioInput
  ): Promise<ProjectScenarioExecution> {
    const scenario =
      requireApplicationEntity(
        await this.scenarios.findById(
          input.companyId,
          input.scenarioId
        ),
        "Cenário não encontrado."
      )

    const snapshot =
      requireApplicationEntity(
        await this.snapshots.findById(
          input.companyId,
          scenario.baseSnapshotId
        ),
        "Snapshot-base não encontrado."
      )

    const organizationSnapshot =
      await this.snapshots
        .findOrganizationById(
          input.companyId,
          scenario.baseSnapshotId
        )

    if (!organizationSnapshot) {
      throw new PlanningApplicationError(
        "not_found",
        "Conteúdo organizacional do snapshot-base não encontrado."
      )
    }

    const planningChangeSets =
      await this.changeSets.findByScenario(
        input.companyId,
        scenario.id
      )

    const changeSets =
      Object.freeze([
        ...planningChangeSets,
      ])

    const projection =
      this.projectionEngine.project({
        snapshot:
          snapshot.toContract(),
        organizationSnapshot,
        scenario:
          scenario.toContract(),
        changeSets:
          toProjectionChangeSets(
            changeSets
          ),
      })

    return Object.freeze({
      scenario,
      snapshot,
      organizationSnapshot,
      changeSets,
      projection,
    })
  }
}

export function createProjectScenarioService(
  dependencies:
    ProjectScenarioServiceDependencies
) {
  return new ProjectScenarioService(
    dependencies.scenarios,
    dependencies.snapshots,
    dependencies.changeSets,
    dependencies.projectionEngine
  )
}
