export class KPIEvaluationApplicationError extends Error {
  readonly code = "KPI_EVALUATION_REPOSITORY_FAILURE"

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "KPIEvaluationApplicationError"
  }
}
