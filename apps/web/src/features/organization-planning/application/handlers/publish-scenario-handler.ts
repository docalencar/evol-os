import { publishScenario } from "../../services/publish-scenario"
import type { PublishScenarioCommand } from "../commands"
import { publishScenarioCommandSchema } from "../commands/planning-command-schemas"
import {
  toScenarioDTO,
  toSnapshotDTO,
} from "../dto/planning-dto-mappers"
import type {
  ScenarioApplicationRepository,
  SnapshotApplicationRepository,
  SnapshotVersionAllocator,
} from "../ports"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"
import type { PlanningUnitOfWork } from "../transactions"
import type { PublishedScenarioDTO } from "../dto"
import {
  assertExpectedVersion,
  executeInUnitOfWork,
  requireApplicationEntity,
} from "./planning-handler-support"

export class PublishScenarioHandler {
  constructor(
    private readonly scenarios: ScenarioApplicationRepository,
    private readonly snapshots: SnapshotApplicationRepository,
    private readonly versionAllocator: SnapshotVersionAllocator,
    private readonly unitOfWork: PlanningUnitOfWork,
    private readonly eventCollector: PlanningDomainEventCollector
  ) {}

  async execute(
    command: PublishScenarioCommand
  ): Promise<PublishedScenarioDTO> {
    const input = publishScenarioCommandSchema.parse(command)

    return executeInUnitOfWork(this.unitOfWork, async () => {
      const scenario = requireApplicationEntity(
        await this.scenarios.findById(
          input.companyId,
          input.scenarioId
        ),
        "Cenário não encontrado."
      )
      assertExpectedVersion(
        input.expectedVersion,
        scenario.version
      )
      const baseSnapshot = requireApplicationEntity(
        await this.snapshots.findById(
          input.companyId,
          scenario.baseSnapshotId
        ),
        "Snapshot-base não encontrado."
      )
      const allocatedSnapshotVersion =
        await this.versionAllocator.allocate(
          scenario.workspaceId
        )
      const result = publishScenario(scenario, {
        snapshotId: input.snapshotId,
        baseSnapshot,
        allocatedSnapshotVersion,
        occurredAt: input.occurredAt,
      })

      await this.scenarios.save(
        result.scenario,
        input.expectedVersion
      )
      await this.snapshots.create(result.snapshot)
      this.eventCollector.collect({
        scenario: result.scenario,
        snapshot: result.snapshot,
      })

      return Object.freeze({
        scenario: toScenarioDTO(result.scenario),
        snapshot: toSnapshotDTO(result.snapshot),
      })
    })
  }
}
