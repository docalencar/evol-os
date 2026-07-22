import type {
  ApprovalRequest,
} from "../domain"

export const APPROVAL_APPLICATION_ERROR_CODES = [
  "invalid_input",
  "not_found",
  "domain_error",
  "version_conflict",
  "persistence_error",
  "unexpected_error",
] as const

export type ApprovalApplicationErrorCode =
  (typeof APPROVAL_APPLICATION_ERROR_CODES)[number]

export type ApprovalApplicationError = {
  code: ApprovalApplicationErrorCode
  message: string
  details?: Readonly<Record<string, unknown>>
}

export type ApprovalApplicationResult<T> =
  | {
      success: true
      data: T
    }
  | {
      success: false
      error: ApprovalApplicationError
    }

export type ApprovalRequestApplicationResult =
  ApprovalApplicationResult<{
    approvalRequest: ApprovalRequest
  }>
