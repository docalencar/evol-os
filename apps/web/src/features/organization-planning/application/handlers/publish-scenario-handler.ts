import type { PublishScenarioCommand } from "../commands"
import { publishScenarioCommandSchema } from "../commands/planning-command-schemas"
import {
  toScenarioDTO,
  toSnapshotDTO,
} from "../dto/planning-dto-mappers"
import type {
  PlanningPublicationRepository,
} from "../ports"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"
import type { PublishedScenarioDTO } from "../dto"

export class PublishScenarioHandler {
  constructor(
    private readonly publication: PlanningPublicationRepository,
    private readonly eventCollector: PlanningDomainEventCollector
  ) {}

  async execute(
    command: PublishScenarioCommand
  ): Promise<PublishedScenarioDTO> {
    const input = publishScenarioCommandSchema.parse(command)

    const result = await this.publication.publish({
      companyId: input.companyId,
      scenarioId: input.scenarioId,
      expectedVersion: input.expectedVersion,
      snapshotId: input.snapshotId,
      publishedAt: input.occurredAt,
    })

    this.eventCollector.collect({
      scenario: result.scenario,
      snapshot: result.snapshot,
    })

    return Object.freeze({
      scenario: toScenarioDTO(result.scenario),
      snapshot: toSnapshotDTO(result.snapshot),
    })
  }
}
