import type { KPIEvaluationApplicationService } from "../.."
import type { KPIExecutionContext, KPIExecutionExecutor, KPIExecutionRequest } from "../contracts"

export class SingleExecutionExecutor implements KPIExecutionExecutor {
  readonly key: string
  constructor(key: string, private readonly evaluations: KPIEvaluationApplicationService) { this.key = key }

  async execute(request: KPIExecutionRequest, context: KPIExecutionContext) {
    try {
      const evaluation = await this.evaluations.evaluate(request.evaluation)
      return Object.freeze({ context, status: "succeeded" as const, evaluation, error: null })
    } catch (error) {
      return Object.freeze({ context, status: "failed" as const, evaluation: null,
        error: error instanceof Error ? error.message : "KPI_EXECUTION_FAILED" })
    }
  }
}
