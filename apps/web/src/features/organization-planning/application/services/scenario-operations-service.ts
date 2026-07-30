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
    const scenario = await this.load(input.companyId, input.scenarioId, input.expectedVersion)
    const renamed = scenario.rename(input.name, input.occurredAt)
    await this.scenarios.save(renamed, input.expectedVersion)
    this.eventCollector.collect({ scenario: renamed })
    return toScenarioDTO(renamed)
  }

  async restore(command: z.input<typeof mutationSchema>) {
    const input = mutationSchema.parse(command)
    const scenario = await this.load(input.companyId, input.scenarioId, input.expectedVersion)
    const restored = scenario.restoreArchive(input.occurredAt)
    await this.scenarios.save(restored, input.expectedVersion)
    this.eventCollector.collect({ scenario: restored })
    return toScenarioDTO(restored)
  }

  async delete(command: Omit<z.input<typeof mutationSchema>, "occurredAt">): Promise<void> {
    const input = mutationSchema.omit({ occurredAt: true }).parse(command)
    const scenario = await this.load(input.companyId, input.scenarioId, input.expectedVersion)
    if (scenario.status !== "draft") {
      throw new PlanningApplicationError("invalid_relation", "Apenas cenários em rascunho podem ser excluídos.")
    }
    const [hasChildren, hasPublishedSnapshot] = await Promise.all([
      this.scenarios.hasChildren(input.companyId, input.scenarioId),
      this.scenarios.hasPublishedSnapshot(input.companyId, input.scenarioId),
    ])
    if (hasChildren) throw new PlanningApplicationError("invalid_relation", "O cenário possui cenários derivados.")
    if (hasPublishedSnapshot) throw new PlanningApplicationError("invalid_relation", "O cenário é utilizado por um snapshot publicado.")
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
