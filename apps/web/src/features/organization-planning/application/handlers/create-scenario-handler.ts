import { createScenario } from "../../services/create-scenario"
import type { CreateScenarioCommand } from "../commands"
import { createScenarioCommandSchema } from "../commands/planning-command-schemas"
import { toScenarioDTO } from "../dto/planning-dto-mappers"
import type {
  ScenarioApplicationRepository,
  SnapshotApplicationRepository,
  WorkspaceApplicationRepository,
} from "../ports"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"
import type { PlanningUnitOfWork } from "../transactions"
import {
  assertApplicationRelation,
  executeInUnitOfWork,
  requireApplicationEntity,
} from "./planning-handler-support"

export class CreateScenarioHandler {
  constructor(
    private readonly workspaces: WorkspaceApplicationRepository,
    private readonly scenarios: ScenarioApplicationRepository,
    private readonly snapshots: SnapshotApplicationRepository,
    private readonly unitOfWork: PlanningUnitOfWork,
    private readonly eventCollector: PlanningDomainEventCollector
  ) {}

  async execute(command: CreateScenarioCommand) {
    const input = createScenarioCommandSchema.parse(command)

    return executeInUnitOfWork(this.unitOfWork, async () => {
      const [workspace, baseSnapshot] = await Promise.all([
        this.workspaces.findById(input.companyId, input.workspaceId),
        this.snapshots.findById(input.companyId, input.baseSnapshotId),
      ])
      requireApplicationEntity(workspace, "Workspace não encontrado.")
      const snapshot = requireApplicationEntity(
        baseSnapshot,
        "Snapshot-base não encontrado."
      )
      assertApplicationRelation(
        snapshot.workspaceId === input.workspaceId,
        "O snapshot-base não pertence ao workspace informado."
      )

      const scenario = createScenario({
        id: input.scenarioId,
        companyId: input.companyId,
        workspaceId: input.workspaceId,
        baseSnapshotId: input.baseSnapshotId,
        name: input.name,
        description: input.description,
        createdAt: input.occurredAt,
      })

      await this.scenarios.create(scenario)
      this.eventCollector.collect({ scenario })
      return toScenarioDTO(scenario)
    })
  }
}
