import type {
  ApprovalRequest,
  ApprovalRequestStatus,
} from "../domain"

export type ApprovalRequestRepositoryErrorCode =
  | "persistence_error"
  | "version_conflict"

export type ApprovalRequestRepositoryError = {
  code: ApprovalRequestRepositoryErrorCode
  message: string
}

export type ApprovalRequestRepositoryResult<T> = {
  data: T
  error: null
} | {
  data: null
  error: ApprovalRequestRepositoryError
}

export type FindApprovalRequestsInput = {
  companyId: string
  status?: ApprovalRequestStatus
  module?: string
  entityType?: string
  entityId?: string
}

export interface ApprovalRequestRepository {
  findById(
    companyId: string,
    approvalRequestId: string
  ): Promise<ApprovalRequestRepositoryResult<ApprovalRequest | null>>

  findAll(
    input: FindApprovalRequestsInput
  ): Promise<ApprovalRequestRepositoryResult<ApprovalRequest[]>>

  save(
    request: ApprovalRequest,
    expectedVersion: number
  ): Promise<ApprovalRequestRepositoryResult<ApprovalRequest>>
}
