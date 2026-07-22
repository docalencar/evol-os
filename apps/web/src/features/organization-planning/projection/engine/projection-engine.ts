import type { ChangeSet } from "../../types/planning-contracts"
import { ProjectionContext } from "../context"
import type { ProjectionInput } from "../contracts"
import { DEFAULT_CHANGE_SET_EXECUTORS, type ChangeSetExecutor } from "../executors"
import { ProjectionPipeline } from "../pipeline"
import { ProjectionResult } from "../result"
import {
  StructuralProjectionMetricsCalculator,
  type ProjectionMetricsCalculator,
} from "../state"
import {
  ProjectionContractValidator,
  type ProjectionValidator,
} from "../validators"

export class ProjectionEngine {
  constructor(
    private readonly pipeline: ProjectionPipeline,
    private readonly validators: readonly ProjectionValidator[],
    private readonly metricsCalculator: ProjectionMetricsCalculator
  ) {}

  static create(executors: readonly ChangeSetExecutor[] = DEFAULT_CHANGE_SET_EXECUTORS) {
    return new ProjectionEngine(
      new ProjectionPipeline(executors),
      [new ProjectionContractValidator()],
      new StructuralProjectionMetricsCalculator()
    )
  }

  project(input: ProjectionInput): ProjectionResult {
    const orderedChangeSets = orderChangeSets(input.changeSets)
    const initialContext = ProjectionContext.create(
      input.snapshot,
      input.scenario,
      orderedChangeSets
    )
    const projectedContext = this.pipeline.execute(initialContext)
    const errors = this.validators.flatMap((validator) => validator.validate(projectedContext))
    const metrics = this.metricsCalculator.calculate(projectedContext.organization)
    const finalContext = projectedContext.withMetrics(metrics)

    return ProjectionResult.create({
      organization: finalContext.organization,
      warnings: finalContext.warnings,
      errors,
    })
  }
}

function orderChangeSets(changeSets: readonly ChangeSet[]) {
  return Object.freeze([...changeSets].sort((left, right) =>
    left.version - right.version || left.id.localeCompare(right.id)
  ))
}
