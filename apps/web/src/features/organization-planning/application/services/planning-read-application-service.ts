import type { PlanningScenario } from "../../domain/planning-scenario"
import type {
  ScenarioComparisonInput,
  ScenarioComparisonResult,
} from "../../projection/comparison"
import type {
  ScenarioExecutionInput,
  ScenarioExecutionResult,
} from "../../projection/execution"
import type { PlanningInsights } from "../../planning-insights"
import type {
  PlanningComparisonViewModel,
  PlanningInsightsViewModel,
} from "../../presentation"
import type { ChangeSet } from "../../types/planning-contracts"
import type { PlanningDashboardViewModel } from "../contracts/planning-dashboard-contract"
import { toScenarioDTO } from "../dto/planning-dto-mappers"
import type {
  PlanningChangeSetRepository,
  PlanningProjectionSnapshotRepository,
  ScenarioApplicationRepository,
} from "../ports"
import {
  findUnexecutedChangeSetFailures,
  PlanningScenarioProjectionError,
  requireApplicationEntity,
} from "../handlers/planning-handler-support"

type ScenarioProjector = Readonly<{
  execute(input: ScenarioExecutionInput): ScenarioExecutionResult
}>

type ScenarioComparator = Readonly<{
  compare(input: ScenarioComparisonInput): ScenarioComparisonResult
}>

type PlanningInsightsAnalyzer = Readonly<{
  analyze(comparison: ScenarioComparisonResult): PlanningInsights
}>

type ComparisonPresenter = Readonly<{
  present(comparison: ScenarioComparisonResult): PlanningComparisonViewModel
}>

type InsightsPresenter = Readonly<{
  present(insights: PlanningInsights): PlanningInsightsViewModel
}>

type PlanningReadApplicationDependencies = Readonly<{
  companyId: string
  scenarios: ScenarioApplicationRepository
  snapshots: PlanningProjectionSnapshotRepository
  changeSets: PlanningChangeSetRepository
  projector: ScenarioProjector
  comparator: ScenarioComparator
  insights: PlanningInsightsAnalyzer
  comparisonPresenter: ComparisonPresenter
  insightsPresenter: InsightsPresenter
}>

export class PlanningReadApplicationService {
  constructor(private readonly dependencies: PlanningReadApplicationDependencies) {}

  async execute(scenarioId: string): Promise<PlanningDashboardViewModel> {
    const scenario = requireApplicationEntity(
      await this.dependencies.scenarios.findById(
        this.dependencies.companyId,
        scenarioId
      ),
      "Cenário não encontrado."
    )
    const snapshot = requireApplicationEntity(
      await this.dependencies.snapshots.findProjectionById(
        this.dependencies.companyId,
        scenario.baseSnapshotId
      ),
      "Snapshot base não encontrado."
    )

    if (!snapshot.organization || !snapshot.kind) {
      throw new PlanningScenarioProjectionError(
        [
          Object.freeze({
            code: "planning.snapshot.organization_missing",
            message: "O snapshot base não possui uma organização persistida.",
          }),
        ],
        "Não foi possível projetar o cenário para leitura."
      )
    }

    const changeSets = await this.dependencies.changeSets.listPublishableByScenario({
      companyId: this.dependencies.companyId,
      scenarioId,
    })
    const execution = this.dependencies.projector.execute({
      snapshot,
      scenario: scenario.toContract(),
      changeSets,
    })
    assertSuccessfulProjection(changeSets, execution)

    const comparison = this.dependencies.comparator.compare({
      before: snapshot,
      after: execution.organization,
    })
    const insights = this.dependencies.insights.analyze(comparison)

    return createDashboardViewModel({
      scenario,
      comparison: this.dependencies.comparisonPresenter.present(comparison),
      insights: this.dependencies.insightsPresenter.present(insights),
      generatedAt: execution.generatedAt,
    })
  }
}

function assertSuccessfulProjection(
  changeSets: readonly ChangeSet[],
  execution: ScenarioExecutionResult
): void {
  const failures = [
    ...execution.issues,
    ...findUnexecutedChangeSetFailures(changeSets, execution.executedChangeSets),
  ]
  if (failures.length > 0) {
    throw new PlanningScenarioProjectionError(
      failures,
      "Não foi possível projetar o cenário para leitura."
    )
  }
}

function createDashboardViewModel(input: Readonly<{
  scenario: PlanningScenario
  comparison: PlanningComparisonViewModel
  insights: PlanningInsightsViewModel
  generatedAt: Date
}>): PlanningDashboardViewModel {
  return Object.freeze({
    scenario: toScenarioDTO(input.scenario),
    comparison: input.comparison,
    insights: input.insights,
    generatedAt: input.generatedAt.toISOString(),
    version: input.scenario.version,
  })
}
