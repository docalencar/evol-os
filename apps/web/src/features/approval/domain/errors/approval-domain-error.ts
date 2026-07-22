export const APPROVAL_DOMAIN_ERROR_CODES = [
  "invalid_input",
  "invalid_transition",
  "request_not_pending",
  "stage_not_active",
  "assignment_not_found",
  "assignment_not_active",
  "actor_not_assigned",
  "actor_not_requester",
  "reason_required",
  "request_expired",
  "expiration_not_reached",
  "subject_version_mismatch",
  "duplicate_decision",
] as const

export type ApprovalDomainErrorCode =
  (typeof APPROVAL_DOMAIN_ERROR_CODES)[number]

export class ApprovalDomainError extends Error {
  readonly code: ApprovalDomainErrorCode
  readonly details: Readonly<Record<string, unknown>>

  constructor(
    code: ApprovalDomainErrorCode,
    message: string,
    details: Record<string, unknown> = {}
  ) {
    super(message)
    this.name = "ApprovalDomainError"
    this.code = code
    this.details = Object.freeze({ ...details })
  }
}

export function assertApprovalDomain(
  condition: unknown,
  code: ApprovalDomainErrorCode,
  message: string,
  details?: Record<string, unknown>
): asserts condition {
  if (!condition) {
    throw new ApprovalDomainError(
      code,
      message,
      details
    )
  }
}
