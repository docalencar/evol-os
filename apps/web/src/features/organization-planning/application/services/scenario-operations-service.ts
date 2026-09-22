import { z } from "zod"

import { toScenarioDTO } from "../dto/planning-dto-mappers"
import { PlanningApplicationError, assertExpectedVersion, requireApplicationEntity } from "../handlers/planning-handler-support"
import type { ScenarioOperationsApplicationRepository } from "../ports"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"

const mutationSchema = z.object({
  companyId: z.string().uuid(), scenarioId: z.string().uuid(),
  expectedVersion: z.number().int().positive(), occurredAt: z.date(),
})
const renameSchema = mutationSchema.extend({
  name: z.string().trim().min(2).max(120),
})

export class ScenarioOperationsService {
  constructor(
    private readonly scenarios: ScenarioOperationsApplicationRepository,
    private readonly eventCollector: PlanningDomainEventCollector
  ) {}

  async rename(command: z.input<typeof renameSchema>) {
    const input = renameSchema.parse(command)
    await this.load(input.companyId, input.scenarioId, input.expectedVersion)
    const renamed = await this.scenarios.rename(input.scenarioId, input.expectedVersion, input.name)
    this.eventCollector.collect({ scenario: renamed })
    return toScenarioDTO(renamed)
  }

  async delete(command: Omit<z.input<typeof mutationSchema>, "occurredAt">): Promise<void> {
    const input = mutationSchema.omit({ occurredAt: true }).parse(command)
    const scenario = await this.load(input.companyId, input.scenarioId, input.expectedVersion)
    if (scenario.status !== "draft") {
      throw new PlanningApplicationError("invalid_relation", "Apenas cenários em rascunho podem ser excluídos.")
    }
    await this.scenarios.deleteDraft(input.companyId, input.scenarioId, input.expectedVersion)
  }

  private async load(companyId: string, scenarioId: string, expectedVersion: number) {
    const scenario = requireApplicationEntity(
      await this.scenarios.findById(companyId, scenarioId), "Cenário não encontrado."
    )
    assertExpectedVersion(expectedVersion, scenario.version)
    return scenario
  }
}
