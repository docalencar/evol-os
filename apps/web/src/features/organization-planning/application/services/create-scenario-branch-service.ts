import type { CreateScenarioBranchCommand } from "../commands"
import { createScenarioBranchCommandSchema } from "../commands"
import { toScenarioDTO } from "../dto/planning-dto-mappers"
import { requireApplicationEntity } from "../handlers/planning-handler-support"
import type { ScenarioBranchApplicationRepository } from "../ports"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"

export class CreateScenarioBranchService {
  constructor(
    private readonly scenarios: ScenarioBranchApplicationRepository,
    private readonly eventCollector: PlanningDomainEventCollector
  ) {}

  async execute(command: CreateScenarioBranchCommand) {
    const input = createScenarioBranchCommandSchema.parse(command)
    const source = requireApplicationEntity(
      await this.scenarios.findById(input.companyId, input.sourceScenarioId),
      "Cenário de origem não encontrado."
    )
    const branch = source.createBranch({
      id: input.scenarioId,
      createdAt: input.occurredAt,
    })

    await this.scenarios.createBranch(branch)
    this.eventCollector.collect({ scenario: branch })

    return toScenarioDTO(branch)
  }
}
