import type {
  ApprovalActorType,
  ApprovalAssignmentStatus,
  ApprovalContextMetadata,
  ApprovalContextValue,
  ApprovalDecisionOutcome,
  ApprovalDecisionRule,
  ApprovalDomainEventType,
  ApprovalPlanSnapshot,
  ApprovalPrincipalType,
  ApprovalRequestStatus,
  ApprovalStageStatus,
} from "../domain"

export type ApprovalRequestRow = {
  id: string
  company_id: string
  module: string
  entity_type: string
  entity_id: string
  entity_version: string
  snapshot_fingerprint: string | null
  requester_actor_type: ApprovalActorType
  requester_actor_id: string | null
  requester_person_id: string | null
  requester_display_name_snapshot: string | null
  context_schema_version: string
  context_summary: string
  context_metadata: ApprovalContextMetadata
  plan_snapshot: ApprovalPlanSnapshot
  status: ApprovalRequestStatus
  requested_at: string
  expires_at: string | null
  completed_at: string | null
  version: number
  idempotency_key: string
  correlation_id: string | null
  supersedes_request_id: string | null
  created_at: string
  updated_at: string
}

export type ApprovalStageRow = {
  id: string
  approval_request_id: string
  company_id: string
  sequence: number
  name: string
  decision_rule: ApprovalDecisionRule
  status: ApprovalStageStatus
  started_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type ApprovalAssignmentRow = {
  id: string
  approval_request_id: string
  stage_id: string
  company_id: string
  principal_type: ApprovalPrincipalType
  principal_id: string
  principal_display_name_snapshot: string | null
  status: ApprovalAssignmentStatus
  assigned_at: string
  decided_at: string | null
  revoked_at: string | null
  created_at: string
  updated_at: string
}

export type ApprovalDecisionRow = {
  id: string
  approval_request_id: string
  stage_id: string
  assignment_id: string
  company_id: string
  actor_type: ApprovalActorType
  actor_id: string | null
  actor_person_id: string | null
  actor_display_name_snapshot: string | null
  outcome: ApprovalDecisionOutcome
  comment: string | null
  decided_at: string
  subject_version: string
  request_version: number
  idempotency_key: string
  created_at: string
}

export type ApprovalRequestPersistenceRecord =
  ApprovalRequestRow & {
    approval_stages: Array<
      ApprovalStageRow & {
        approval_assignments: ApprovalAssignmentRow[]
      }
    >
    approval_decisions: ApprovalDecisionRow[]
  }

export type ApprovalRequestWritePayload = {
  request: Omit<
    ApprovalRequestRow,
    "created_at" | "updated_at"
  >
  stages: Array<
    Omit<ApprovalStageRow, "created_at" | "updated_at">
  >
  assignments: Array<
    Omit<ApprovalAssignmentRow, "created_at" | "updated_at">
  >
  decisions: Array<
    Omit<ApprovalDecisionRow, "created_at">
  >
}

export type ApprovalDomainEventWritePayload = {
  event_type: ApprovalDomainEventType
  actor_type: ApprovalActorType
  actor_id: string | null
  actor_person_id: string | null
  actor_display_name_snapshot: string | null
  occurred_at: string
  aggregate_version: number
  payload: Readonly<Record<string, ApprovalContextValue>>
}
