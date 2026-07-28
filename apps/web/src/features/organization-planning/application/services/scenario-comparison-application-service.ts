import { ScenarioComparisonEngine } from "../../projection/comparison/scenario-comparison-engine"
import type {
  ScenarioComparisonInput,
  ScenarioComparisonResult,
} from "../../projection/comparison/comparison-contracts"
import { ScenarioComparisonPresenter } from "../../projection/comparison/presenters"
import type { ScenarioComparisonViewModel } from "../../projection/comparison/view-models"
import { bootstrapProjectedOrganization } from "../../projection/bootstrap"
import type { ProjectionIssue } from "../../projection/contracts"
import type { ProjectScenarioService } from "./project-scenario-service"

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
  compare(input: ScenarioComparisonInput): ScenarioComparisonResult
  present(comparison: ScenarioComparisonResult): ScenarioComparisonViewModel
}>

const defaultPipeline: ScenarioComparisonPipeline = Object.freeze({
  compare: (input) => ScenarioComparisonEngine.create().compare(input),
  present: (comparison) => ScenarioComparisonPresenter.present(comparison),
})

export class ScenarioComparisonApplicationService {
  constructor(
    private readonly projectScenarioService: ProjectScenarioService,
    private readonly pipeline: ScenarioComparisonPipeline = defaultPipeline
  ) {}

  async execute(
    input: ScenarioComparisonApplicationInput
  ): Promise<ScenarioComparisonViewModel> {
    const execution = await this.projectScenarioService.executeWithContext(input)

    if (execution.projection.errors.length > 0) {
      throw new ScenarioComparisonProjectionError(execution.projection.errors)
    }

    const comparison = this.pipeline.compare({
      baseOrganization: bootstrapProjectedOrganization(
        execution.organizationSnapshot
      ),
      projectedOrganization: execution.projection.organization,
    })

    return this.pipeline.present(comparison)
  }
}

export function createScenarioComparisonApplicationService(
  projectScenarioService: ProjectScenarioService
) {
  return new ScenarioComparisonApplicationService(projectScenarioService)
}
