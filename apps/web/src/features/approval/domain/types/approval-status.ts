export const APPROVAL_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "withdrawn",
  "cancelled",
  "expired",
] as const

export type ApprovalRequestStatus =
  (typeof APPROVAL_REQUEST_STATUSES)[number]

export const APPROVAL_STAGE_STATUSES = [
  "waiting",
  "active",
  "approved",
  "rejected",
  "cancelled",
  "skipped",
] as const

export type ApprovalStageStatus =
  (typeof APPROVAL_STAGE_STATUSES)[number]

export const APPROVAL_ASSIGNMENT_STATUSES = [
  "assigned",
  "decided",
  "revoked",
] as const

export type ApprovalAssignmentStatus =
  (typeof APPROVAL_ASSIGNMENT_STATUSES)[number]

export const APPROVAL_DECISION_OUTCOMES = [
  "approved",
  "rejected",
] as const

export type ApprovalDecisionOutcome =
  (typeof APPROVAL_DECISION_OUTCOMES)[number]
