export const KPI_EVALUATION_ERROR_CODES = [
  "INVALID_CONTEXT",
  "INVALID_METADATA",
  "OWNER_MODULE_MISMATCH",
  "CALCULATION_FAILED",
] as const

export type KPIEvaluationErrorCode =
  (typeof KPI_EVALUATION_ERROR_CODES)[number]

export class KPIEvaluationError extends Error {
  constructor(
    readonly code: KPIEvaluationErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options)
    this.name = "KPIEvaluationError"
  }
}
