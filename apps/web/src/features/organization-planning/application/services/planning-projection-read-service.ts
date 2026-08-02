import type { PlanningScenario } from "../../domain/planning-scenario"
import type { ProjectionSnapshot } from "../../projection/contracts"
import type {
  ScenarioExecutionInput,
  ScenarioExecutionResult,
} from "../../projection/execution"
import type { ChangeSet } from "../../types/planning-contracts"
import {
  findUnexecutedChangeSetFailures,
  PlanningScenarioProjectionError,
  requireApplicationEntity,
} from "../handlers/planning-handler-support"
import type {
  PlanningChangeSetRepository,
  PlanningProjectionSnapshotRepository,
  ScenarioApplicationRepository,
} from "../ports"

type ScenarioProjector = Readonly<{
  execute(
    input: ScenarioExecutionInput,
  ): ScenarioExecutionResult
}>

export type PlanningProjectionReadResult = Readonly<{
  scenario: PlanningScenario
  snapshot: ProjectionSnapshot
  changeSets: readonly ChangeSet[]
  execution: ScenarioExecutionResult
}>

export type PlanningProjectionReadDependencies = Readonly<{
  companyId: string
  scenarios: ScenarioApplicationRepository
  snapshots: PlanningProjectionSnapshotRepository
  changeSets: PlanningChangeSetRepository
  projector: ScenarioProjector
}>

export class PlanningProjectionReadService {
  constructor(
    private readonly dependencies:
      PlanningProjectionReadDependencies,
  ) {}

  async execute(
    scenarioId: string,
  ): Promise<PlanningProjectionReadResult> {
    const scenario = requireApplicationEntity(
      await this.dependencies.scenarios.findById(
        this.dependencies.companyId,
        scenarioId,
      ),
      "Cenário não encontrado.",
    )

    const snapshot = requireApplicationEntity(
      await this.dependencies.snapshots.findProjectionById(
        this.dependencies.companyId,
        scenario.baseSnapshotId,
      ),
      "Snapshot base não encontrado.",
    )

    assertValidSnapshot(snapshot)

    const changeSets =
      await this.dependencies.changeSets.listPublishableByScenario({
        companyId: this.dependencies.companyId,
        scenarioId,
      })

    const execution =
      this.dependencies.projector.execute({
        snapshot,
        scenario: scenario.toContract(),
        changeSets,
      })

    assertSuccessfulProjection(
      changeSets,
      execution,
    )

    return Object.freeze({
      scenario,
      snapshot,
      changeSets: Object.freeze([
        ...changeSets,
      ]),
      execution,
    })
  }
}

function assertValidSnapshot(
  snapshot: ProjectionSnapshot,
): void {
  if (
    snapshot.organization &&
    snapshot.kind
  ) {
    return
  }

  throw new PlanningScenarioProjectionError(
    [
      Object.freeze({
        code: "planning.snapshot.organization_missing",
        message:
          "O snapshot base não possui uma organização persistida.",
      }),
    ],
    "Não foi possível projetar o cenário para leitura.",
  )
}

function assertSuccessfulProjection(
  changeSets: readonly ChangeSet[],
  execution: ScenarioExecutionResult,
): void {
  const failures = [
    ...execution.issues,
    ...findUnexecutedChangeSetFailures(
      changeSets,
      execution.executedChangeSets,
    ),
  ]

  if (failures.length === 0) {
    return
  }

  throw new PlanningScenarioProjectionError(
    failures,
    "Não foi possível projetar o cenário para leitura.",
  )
}
