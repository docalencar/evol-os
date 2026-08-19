import {
  type ApprovalActor,
} from "../domain"
import {
  mapApprovalDomainEventsToPersistence,
  mapApprovalRequestToDomain,
  mapApprovalRequestToPersistence,
} from "../mappers"
import type {
  ApprovalRequestPersistenceRecord,
} from "../persistence"
import type {
  ApprovalApplicationResult,
} from "./approval-application-result"
import {
  failure,
  mapApplicationError,
} from "./approval-application-support"

// Serialized decision payload for an EXISTING approval request, produced by the
// framework's own domain rule (aggregate.decide) and serializers — the engine is
// reused, never reimplemented. expectedVersion is the aggregate version BEFORE the
// decision, for the optimistic-concurrency contract of save_approval_request.
export type ApprovalDecisionSubmissionPayload = {
  aggregate: ReturnType<typeof mapApprovalRequestToPersistence>
  events: ReturnType<typeof mapApprovalDomainEventsToPersistence>
  expectedVersion: number
}

export type BuildApprovalDecisionInput = {
  record: ApprovalRequestPersistenceRecord
  decisionId: string
  actor: ApprovalActor
  outcome: "approved" | "rejected"
  occurredAt: Date
  idempotencyKey: string
}

export function buildApprovalDecisionSubmission(
  input: BuildApprovalDecisionInput
): ApprovalApplicationResult<ApprovalDecisionSubmissionPayload> {
  let aggregate
  try {
    aggregate = mapApprovalRequestToDomain(input.record)
  } catch (error) {
    return failure(mapApplicationError(error))
  }

  // Captured before the decision — the optimistic-concurrency baseline.
  const expectedVersion = aggregate.version

  const activeStage = aggregate.stages.find(
    (stage) => stage.status === "active"
  )
  const assignment = activeStage?.assignments.find(
    (candidate) => candidate.status === "assigned"
  )

  if (!assignment) {
    return failure({
      code: "domain_error",
      message: "A solicitação não possui um aprovador ativo.",
    })
  }

  try {
    aggregate.decide({
      decisionId: input.decisionId,
      assignmentId: assignment.id,
      actor: input.actor,
      outcome: input.outcome,
      decidedAt: input.occurredAt,
      subjectVersion: aggregate.subject.entityVersion,
      expectedVersion,
      idempotencyKey: input.idempotencyKey,
    })

    return {
      success: true,
      data: {
        aggregate: mapApprovalRequestToPersistence(aggregate),
        events: mapApprovalDomainEventsToPersistence(
          aggregate.getPendingDomainEvents()
        ),
        expectedVersion,
      },
    }
  } catch (error) {
    return failure(mapApplicationError(error))
  }
}
