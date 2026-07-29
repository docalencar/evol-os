import type { PublishScenarioCommand } from "../commands"
import { publishScenarioCommandSchema } from "../commands/planning-command-schemas"
import {
  toScenarioDTO,
  toSnapshotDTO,
} from "../dto/planning-dto-mappers"
import type {
  PlanningChangeSetRepository,
  PlanningPublicationRepository,
  PlanningProjectionSnapshotRepository,
  ScenarioApplicationRepository,
} from "../ports"
import { PlanningDomainEventCollector } from "../planning-domain-event-collector"
import type { PublishedScenarioDTO } from "../dto"
import { ScenarioExecutor } from "../../projection"
import {
  PlanningScenarioProjectionError,
  requireApplicationEntity,
} from "./planning-handler-support"

export class PublishScenarioHandler {
  constructor(
    private readonly scenarios: ScenarioApplicationRepository,
    private readonly snapshots: PlanningProjectionSnapshotRepository,
    private readonly changeSets: PlanningChangeSetRepository,
    private readonly executor: ScenarioExecutor,
    private readonly publication: PlanningPublicationRepository,
    private readonly eventCollector: PlanningDomainEventCollector
  ) {}

  async execute(
    command: PublishScenarioCommand
  ): Promise<PublishedScenarioDTO> {
    const input = publishScenarioCommandSchema.parse(command)

    const scenario = requireApplicationEntity(
      await this.scenarios.findById(
        input.companyId,
        input.scenarioId
      ),
      "Cenário não encontrado."
    )
    const snapshot = requireApplicationEntity(
      await this.snapshots.findProjectionById(
        input.companyId,
        scenario.baseSnapshotId
      ),
      "Snapshot base não encontrado."
    )

    if (!snapshot.organization || !snapshot.kind) {
      throw new PlanningScenarioProjectionError([
        {
          code: "planning.snapshot.organization_missing",
          message:
            "O snapshot base não possui uma organização persistida.",
        },
      ])
    }

    const changeSets =
      await this.changeSets.listPublishableByScenario({
        companyId: input.companyId,
        scenarioId: input.scenarioId,
      })
    const execution = this.executor.execute({
      snapshot,
      scenario: scenario.toContract(),
      changeSets,
    })

    const failures = [
      ...execution.issues,
      ...findUnexecutedChangeSetFailures(
        changeSets,
        execution.executedChangeSets
      ),
    ]

    if (failures.length > 0) {
      throw new PlanningScenarioProjectionError(failures)
    }

    const result = await this.publication.publish({
      companyId: input.companyId,
      scenarioId: input.scenarioId,
      expectedVersion: input.expectedVersion,
      snapshotId: input.snapshotId,
      publishedAt: input.occurredAt,
      organization: execution.organization,
      changeSets,
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

function findUnexecutedChangeSetFailures(
  changeSets: readonly { id: string }[],
  executedChangeSets: readonly { id: string }[]
) {
  const executedIds = new Set(
    executedChangeSets.map((changeSet) => changeSet.id)
  )

  return changeSets
    .filter((changeSet) => !executedIds.has(changeSet.id))
    .map((changeSet) => Object.freeze({
      code: "planning.change_set.not_executed",
      message: `O change set ${changeSet.id} não foi executado.`,
      changeSetId: changeSet.id,
    }))
}
