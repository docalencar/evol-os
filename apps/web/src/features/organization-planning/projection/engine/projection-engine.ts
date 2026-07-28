import { ProjectionContext } from "../context"
import type { ProjectionInput } from "../contracts"
import {
  DEFAULT_CHANGE_SET_EXECUTORS,
  type ChangeSetExecutor,
} from "../executors"
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
import { orderChangeSets } from "./order-change-sets"

export class ProjectionEngine {
  constructor(
    private readonly pipeline: ProjectionPipeline,
    private readonly validators:
      readonly ProjectionValidator[],
    private readonly metricsCalculator:
      ProjectionMetricsCalculator
  ) {}

  static create(
    executors: readonly ChangeSetExecutor[] =
      DEFAULT_CHANGE_SET_EXECUTORS
  ) {
    return new ProjectionEngine(
      new ProjectionPipeline(executors),
      [new ProjectionContractValidator()],
      new StructuralProjectionMetricsCalculator()
    )
  }

  project(input: ProjectionInput): ProjectionResult {
    const orderedChangeSets =
      orderChangeSets(input.changeSets)

    const initialContext =
      ProjectionContext.create(
        input.snapshot,
        input.scenario,
        orderedChangeSets
      )

    // A validação de contrato roda ANTES de qualquer mutação do estado
    // projetado. Um change set fora de escopo (ou qualquer outra violação de
    // contrato) invalida todo o input; nesse caso o pipeline não é executado,
    // de forma que nenhum change set produza eventos, warnings ou alterações
    // organizacionais.
    const contractErrors =
      this.validators.flatMap((validator) =>
        validator.validate(initialContext)
      )

    const executedContext =
      contractErrors.length > 0
        ? initialContext
        : this.pipeline.execute(initialContext)

    const metrics =
      this.metricsCalculator.calculate(
        executedContext.organization
      )

    const finalContext =
      executedContext.withMetrics(metrics)

    return ProjectionResult.create({
      organization: finalContext.organization,
      warnings: finalContext.warnings,
      errors: Object.freeze([
        ...finalContext.errors,
        ...contractErrors,
      ]),
    })
  }
}
