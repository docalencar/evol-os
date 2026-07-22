import { archiveScenario } from "../../services/archive-scenario"
import type { ArchiveScenarioCommand } from "../commands"
import { archiveScenarioCommandSchema } from "../commands/planning-command-schemas"
import { toScenarioDTO } from "../dto/planning-dto-mappers"
import type { ScenarioApplicationRepository } from "../ports"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"
import type { PlanningUnitOfWork } from "../transactions"
import {
  assertExpectedVersion,
  executeInUnitOfWork,
  requireApplicationEntity,
} from "./planning-handler-support"

export class ArchiveScenarioHandler {
  constructor(
    private readonly scenarios: ScenarioApplicationRepository,
    private readonly unitOfWork: PlanningUnitOfWork,
    private readonly eventCollector: PlanningDomainEventCollector
  ) {}

  async execute(command: ArchiveScenarioCommand) {
    const input = archiveScenarioCommandSchema.parse(command)

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
      const archived = archiveScenario(
        scenario,
        input.occurredAt
      )

      await this.scenarios.save(
        archived,
        input.expectedVersion
      )
      this.eventCollector.collect({ scenario: archived })
      return toScenarioDTO(archived)
    })
  }
}
