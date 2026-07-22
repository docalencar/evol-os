export type PlanningDomainErrorCode =
  | "invalid_input"
  | "invalid_transition"
  | "immutable_entity"

export class PlanningDomainError extends Error {
  constructor(
    readonly code: PlanningDomainErrorCode,
    message: string
  ) {
    super(message)
    this.name = "PlanningDomainError"
  }
}

export function assertPlanningDomain(
  condition: unknown,
  code: PlanningDomainErrorCode,
  message: string
): asserts condition {
  if (!condition) {
    throw new PlanningDomainError(code, message)
  }
}
