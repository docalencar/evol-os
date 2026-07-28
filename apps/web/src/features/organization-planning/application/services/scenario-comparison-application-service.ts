import { ScenarioComparisonEngine } from "../../projection/comparison/scenario-comparison-engine"
import type {
  ScenarioComparisonInput,
  ScenarioComparisonResult,
} from "../../projection/comparison/comparison-contracts"
import { ScenarioComparisonPresenter } from "../../projection/comparison/presenters"
import type { ScenarioComparisonViewModel } from "../../projection/comparison/view-models"
import type { ProjectionIssue } from "../../projection/contracts"
import {
  ScenarioExecutor,
  type ScenarioExecutionInput,
  type ScenarioExecutionResult,
} from "../../projection/execution"
import type {
  PlanningChangeSetApplicationRepository,
  ScenarioApplicationRepository,
  SnapshotApplicationRepository,
} from "../ports"
import {
  assertApplicationRelation,
  requireApplicationEntity,
} from "../handlers/planning-handler-support"

export type ScenarioComparisonApplicationInput = Readonly<{
  companyId: string
  scenarioId: string
}>

export class ScenarioComparisonProjectionError extends Error {
  readonly code = "scenario_comparison.projection_failed"
  readonly issues: readonly ProjectionIssue[]

  constructor(issues: readonly ProjectionIssue[]) {
    super("A projeção do cenário contém erros e não pode ser comparada.")
    this.name = "ScenarioComparisonProjectionError"
    this.issues = Object.freeze(
      issues.map((issue) => Object.freeze({ ...issue }))
    )
  }
}

type ScenarioComparisonPipeline = Readonly<{
  execute(input: ScenarioExecutionInput): ScenarioExecutionResult
  compare(input: ScenarioComparisonInput): ScenarioComparisonResult
  present(comparison: ScenarioComparisonResult): ScenarioComparisonViewModel
}>

const defaultPipeline: ScenarioComparisonPipeline = Object.freeze({
  execute: (input) => ScenarioExecutor.create().execute(input),
  compare: (input) => ScenarioComparisonEngine.create().compare(input),
  present: (comparison) => ScenarioComparisonPresenter.present(comparison),
})

export class ScenarioComparisonApplicationService {
  constructor(
    private readonly scenarios: ScenarioApplicationRepository,
    private readonly snapshots: SnapshotApplicationRepository,
    private readonly changeSets: PlanningChangeSetApplicationRepository,
    private readonly pipeline: ScenarioComparisonPipeline = defaultPipeline
  ) {}

  async execute(
    input: ScenarioComparisonApplicationInput
  ): Promise<ScenarioComparisonViewModel> {
    const scenario = requireApplicationEntity(
      await this.scenarios.findById(input.companyId, input.scenarioId),
      "Cenário não encontrado."
    )
    const [baseSnapshot, changeSets] = await Promise.all([
      this.snapshots.findById(input.companyId, scenario.baseSnapshotId),
      this.changeSets.findByScenario(input.companyId, scenario.id),
    ])
    const snapshot = requireApplicationEntity(
      baseSnapshot,
      "Snapshot-base não encontrado."
    )
    assertApplicationRelation(
      snapshot.workspaceId === scenario.workspaceId,
      "O snapshot-base não pertence ao workspace do cenário."
    )

    const executionInput = {
      snapshot: snapshot.toContract(),
      scenario: scenario.toContract(),
    }
    const baseOrganization = this.pipeline.execute({
      ...executionInput,
      changeSets: [],
    }).organization
    const execution = this.pipeline.execute({
      ...executionInput,
      changeSets,
    })

    if (execution.issues.length > 0) {
      throw new ScenarioComparisonProjectionError(execution.issues)
    }

    const comparison = this.pipeline.compare({
      baseOrganization,
      projectedOrganization: execution.organization,
    })

    return this.pipeline.present(comparison)
  }
}
