import type { PlanningScenario } from "../../domain/planning-scenario"
import type {
  ScenarioComparisonInput,
  ScenarioComparisonResult,
} from "../../projection/comparison"
import type { PlanningInsights } from "../../planning-insights"
import type {
  PlanningComparisonViewModel,
  PlanningInsightsViewModel,
} from "../../presentation"
import { parseDepartmentChangeSet } from "../../projection"
import type {
  PlanningContentEditorViewModel,
  PlanningDashboardViewModel,
} from "../contracts/planning-dashboard-contract"
import { toScenarioDTO } from "../dto/planning-dto-mappers"
import type {
  PlanningProjectionReadResult,
} from "./planning-projection-read-service"

type PlanningProjectionReader = Readonly<{
  execute(
    scenarioId: string,
  ): Promise<PlanningProjectionReadResult>
}>

type ScenarioComparator = Readonly<{
  compare(
    input: ScenarioComparisonInput,
  ): ScenarioComparisonResult
}>

type PlanningInsightsAnalyzer = Readonly<{
  analyze(
    comparison: ScenarioComparisonResult,
  ): PlanningInsights
}>

type ComparisonPresenter = Readonly<{
  present(
    comparison: ScenarioComparisonResult,
  ): PlanningComparisonViewModel
}>

type InsightsPresenter = Readonly<{
  present(
    insights: PlanningInsights,
  ): PlanningInsightsViewModel
}>

export type PlanningReadApplicationDependencies =
  Readonly<{
    projection: PlanningProjectionReader
    comparator: ScenarioComparator
    insights: PlanningInsightsAnalyzer
    comparisonPresenter: ComparisonPresenter
    insightsPresenter: InsightsPresenter
  }>

export class PlanningReadApplicationService {
  constructor(
    private readonly dependencies:
      PlanningReadApplicationDependencies,
  ) {}

  async execute(
    scenarioId: string,
  ): Promise<PlanningDashboardViewModel> {
    const projection =
      await this.dependencies.projection.execute(
        scenarioId,
      )

    const comparison =
      this.dependencies.comparator.compare({
        before: projection.snapshot,
        after:
          projection.execution.organization,
      })

    const insights =
      this.dependencies.insights.analyze(
        comparison,
      )

    return createDashboardViewModel({
      scenario: projection.scenario,
      content: createContentEditorViewModel(projection),
      comparison:
        this.dependencies.comparisonPresenter.present(
          comparison,
        ),
      insights:
        this.dependencies.insightsPresenter.present(
          insights,
        ),
      generatedAt:
        projection.execution.generatedAt,
    })
  }
}

function createDashboardViewModel(
  input: Readonly<{
    scenario: PlanningScenario
    content: PlanningContentEditorViewModel
    comparison: PlanningComparisonViewModel
    insights: PlanningInsightsViewModel
    generatedAt: Date
  }>,
): PlanningDashboardViewModel {
  return Object.freeze({
    scenario: toScenarioDTO(input.scenario),
    content: input.content,
    comparison: input.comparison,
    insights: input.insights,
    generatedAt:
      input.generatedAt.toISOString(),
    version: input.scenario.version,
  })
}

function createContentEditorViewModel(
  projection: PlanningProjectionReadResult
): PlanningContentEditorViewModel {
  const changeSets = projection.changeSets.flatMap((changeSet) => {
    if (changeSet.changeType !== "department.create") return []
    const parsed = parseDepartmentChangeSet(changeSet)
    if (!parsed.success || parsed.changeSet.changeType !== "department.create") {
      return []
    }
    return [Object.freeze({
      id: changeSet.id,
      version: changeSet.version,
      ...parsed.changeSet.payload,
    })]
  })
  const createdIds = new Set(changeSets.map((changeSet) => changeSet.departmentId))
  const projectedDepartments = projection.execution.organization.departments
    .filter((department) => createdIds.has(department.id))
    .map((department) => Object.freeze({
      id: department.id,
      name: department.name,
      code: department.code,
    }))

  return Object.freeze({
    changeSets: Object.freeze(changeSets),
    projectedDepartments: Object.freeze(projectedDepartments),
  })
}
