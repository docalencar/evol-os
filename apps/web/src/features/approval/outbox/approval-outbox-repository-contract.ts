import type {
  ApprovalDomainEvent,
} from "../domain"

export type ApprovalOutboxEvent = {
  id: string
  eventKey: string
  processingToken: string
  attemptCount: number
  domainEvent: ApprovalDomainEvent
}

export type ClaimApprovalOutboxEventsInput = {
  companyId: string
  batchSize: number
  lockTimeoutSeconds: number
}

export type CompleteApprovalOutboxEventInput = {
  companyId: string
  eventId: string
  processingToken: string
  processedAt: Date
}

export type FailApprovalOutboxEventInput = {
  companyId: string
  eventId: string
  processingToken: string
  error: string
  nextAttemptAt: Date
}

export type ApprovalOutboxRepositoryError = {
  code: "persistence_error" | "claim_lost"
  message: string
}

export type ApprovalOutboxRepositoryResult<T> =
  | { data: T; error: null }
  | { data: null; error: ApprovalOutboxRepositoryError }

export interface ApprovalOutboxRepository {
  claimPending(
    input: ClaimApprovalOutboxEventsInput
  ): Promise<ApprovalOutboxRepositoryResult<ApprovalOutboxEvent[]>>

  markProcessed(
    input: CompleteApprovalOutboxEventInput
  ): Promise<ApprovalOutboxRepositoryResult<true>>

  markFailed(
    input: FailApprovalOutboxEventInput
  ): Promise<ApprovalOutboxRepositoryResult<true>>
}
