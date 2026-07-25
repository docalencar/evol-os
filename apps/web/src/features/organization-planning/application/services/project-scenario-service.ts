import {
  toProjectionChangeSets,
} from "../../change-sets/adapters/to-projection-change-set"
import {
  ProjectionEngine,
} from "../../projection"
import type {
  ProjectionResult,
} from "../../projection"
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

export type ProjectScenarioServiceDependencies =
  Readonly<{
    scenarios: ScenarioApplicationRepository
    snapshots: SnapshotApplicationRepository
    changeSets: PlanningChangeSetApplicationRepository
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
      await this.snapshots.findOrganizationById(
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

    return this.projectionEngine.project({
      snapshot:
        snapshot.toContract(),
      organizationSnapshot,
      scenario:
        scenario.toContract(),
      changeSets:
        toProjectionChangeSets(
          planningChangeSets
        ),
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
