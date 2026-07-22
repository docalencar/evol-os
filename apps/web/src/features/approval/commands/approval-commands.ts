import type {
  ApprovalActor,
  RequestApprovalInput,
} from "../domain"

export type CreateApprovalRequestCommand =
  RequestApprovalInput

type ExistingApprovalRequestCommand = {
  companyId: string
  approvalRequestId: string
  expectedVersion: number
  actor: ApprovalActor
  occurredAt: Date
}

type DecideApprovalRequestCommand =
  ExistingApprovalRequestCommand & {
    decisionId: string
    assignmentId: string
    subjectVersion: string
    idempotencyKey: string
  }

export type ApproveRequestCommand =
  DecideApprovalRequestCommand

export type RejectRequestCommand =
  DecideApprovalRequestCommand & {
    comment: string
  }

export type WithdrawRequestCommand =
  ExistingApprovalRequestCommand & {
    reason: string
  }

export type CancelRequestCommand =
  ExistingApprovalRequestCommand & {
    reason: string
  }

export type ExpireRequestCommand =
  ExistingApprovalRequestCommand
