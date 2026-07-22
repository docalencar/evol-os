import {
  ApprovalDecision,
  ApprovalRequest,
  createApprovalActor,
  createApprovalContext,
  createApprovalPlanSnapshot,
  createApprovalPrincipal,
  createApprovalSubjectRef,
} from "../domain"
import type {
  ApprovalDomainEvent,
} from "../domain"
import type {
  ApprovalDomainEventWritePayload,
  ApprovalRequestPersistenceRecord,
  ApprovalRequestWritePayload,
} from "../persistence"

function toIsoString(value: Date | null): string | null {
  return value?.toISOString() ?? null
}

export function mapApprovalRequestToPersistence(
  request: ApprovalRequest
): ApprovalRequestWritePayload {
  const stages = request.stages.map((stage) => ({
    id: stage.id,
    approval_request_id: request.id,
    company_id: request.companyId,
    sequence: stage.sequence,
    name: stage.name,
    decision_rule: stage.decisionRule,
    status: stage.status,
    started_at: toIsoString(stage.startedAt),
    completed_at: toIsoString(stage.completedAt),
  }))
  const assignments = request.stages.flatMap((stage) =>
    stage.assignments.map((assignment) => ({
      id: assignment.id,
      approval_request_id: request.id,
      stage_id: stage.id,
      company_id: request.companyId,
      principal_type:
        assignment.principal.principalType,
      principal_id:
        assignment.principal.principalId,
      principal_display_name_snapshot:
        assignment.principal.displayNameSnapshot,
      status: assignment.status,
      assigned_at: assignment.assignedAt.toISOString(),
      decided_at: toIsoString(assignment.decidedAt),
      revoked_at: toIsoString(assignment.revokedAt),
    }))
  )
  const decisions = request.decisions.map((decision) => ({
    id: decision.id,
    approval_request_id: request.id,
    stage_id: decision.stageId,
    assignment_id: decision.assignmentId,
    company_id: request.companyId,
    actor_type: decision.actor.actorType,
    actor_id: decision.actor.actorId,
    actor_person_id: decision.actor.personId,
    actor_display_name_snapshot:
      decision.actor.displayNameSnapshot,
    outcome: decision.outcome,
    comment: decision.comment,
    decided_at: decision.decidedAt.toISOString(),
    subject_version: decision.subjectVersion,
    request_version: decision.requestVersion,
    idempotency_key: decision.idempotencyKey,
  }))

  return {
    request: {
      id: request.id,
      company_id: request.companyId,
      module: request.subject.module,
      entity_type: request.subject.entityType,
      entity_id: request.subject.entityId,
      entity_version: request.subject.entityVersion,
      snapshot_fingerprint:
        request.subject.snapshotFingerprint,
      requester_actor_type:
        request.requester.actorType,
      requester_actor_id: request.requester.actorId,
      requester_person_id: request.requester.personId,
      requester_display_name_snapshot:
        request.requester.displayNameSnapshot,
      context_schema_version:
        request.context.schemaVersion,
      context_summary: request.context.summary,
      context_metadata: request.context.metadata,
      plan_snapshot: request.planSnapshot,
      status: request.status,
      requested_at: request.requestedAt.toISOString(),
      expires_at: toIsoString(request.expiresAt),
      completed_at: toIsoString(request.completedAt),
      version: request.version,
      idempotency_key: request.idempotencyKey,
      correlation_id: request.correlationId,
      supersedes_request_id: request.supersedesRequestId,
    },
    stages,
    assignments,
    decisions,
  }
}

export function mapApprovalDomainEventsToPersistence(
  events: readonly ApprovalDomainEvent[]
): ApprovalDomainEventWritePayload[] {
  return events.map((event) => ({
    event_type: event.eventType,
    actor_type: event.actor.actorType,
    actor_id: event.actor.actorId,
    actor_person_id: event.actor.personId,
    actor_display_name_snapshot:
      event.actor.displayNameSnapshot,
    occurred_at: event.occurredAt.toISOString(),
    aggregate_version: event.aggregateVersion,
    payload: event.payload,
  }))
}

export function mapApprovalRequestToDomain(
  record: ApprovalRequestPersistenceRecord
): ApprovalRequest {
  const stages = [...record.approval_stages]
    .sort((left, right) => left.sequence - right.sequence)
    .map((stage) => ({
      id: stage.id,
      sequence: stage.sequence,
      name: stage.name,
      decisionRule: stage.decision_rule,
      status: stage.status,
      assignments: [...stage.approval_assignments]
        .sort((left, right) =>
          left.assigned_at.localeCompare(right.assigned_at)
        )
        .map((assignment) => ({
          id: assignment.id,
          stageId: assignment.stage_id,
          principal: createApprovalPrincipal({
            principalType: assignment.principal_type,
            principalId: assignment.principal_id,
            displayNameSnapshot:
              assignment.principal_display_name_snapshot,
          }),
          status: assignment.status,
          assignedAt: new Date(assignment.assigned_at),
          decidedAt: assignment.decided_at
            ? new Date(assignment.decided_at)
            : null,
          revokedAt: assignment.revoked_at
            ? new Date(assignment.revoked_at)
            : null,
        })),
      startedAt: stage.started_at
        ? new Date(stage.started_at)
        : null,
      completedAt: stage.completed_at
        ? new Date(stage.completed_at)
        : null,
    }))
  const decisions = [...record.approval_decisions]
    .sort((left, right) =>
      left.decided_at.localeCompare(right.decided_at)
    )
    .map((decision) =>
      ApprovalDecision.create({
        id: decision.id,
        approvalRequestId: decision.approval_request_id,
        stageId: decision.stage_id,
        assignmentId: decision.assignment_id,
        actor: createApprovalActor({
          actorType: decision.actor_type,
          actorId: decision.actor_id,
          personId: decision.actor_person_id,
          displayNameSnapshot:
            decision.actor_display_name_snapshot,
        }),
        outcome: decision.outcome,
        comment: decision.comment,
        decidedAt: new Date(decision.decided_at),
        subjectVersion: decision.subject_version,
        requestVersion: decision.request_version,
        idempotencyKey: decision.idempotency_key,
      })
    )

  return ApprovalRequest.restore({
    id: record.id,
    subject: createApprovalSubjectRef({
      companyId: record.company_id,
      module: record.module,
      entityType: record.entity_type,
      entityId: record.entity_id,
      entityVersion: record.entity_version,
      snapshotFingerprint: record.snapshot_fingerprint,
    }),
    requester: createApprovalActor({
      actorType: record.requester_actor_type,
      actorId: record.requester_actor_id,
      personId: record.requester_person_id,
      displayNameSnapshot:
        record.requester_display_name_snapshot,
    }),
    context: createApprovalContext({
      schemaVersion: record.context_schema_version,
      summary: record.context_summary,
      metadata: record.context_metadata,
    }),
    planSnapshot: createApprovalPlanSnapshot({
      policyId: record.plan_snapshot.policyId,
      policyVersion: record.plan_snapshot.policyVersion,
      stages: record.plan_snapshot.stages.map((stage) => ({
        ...stage,
        assignments: stage.assignments.map((assignment) => ({
          ...assignment,
        })),
      })),
    }),
    status: record.status,
    stages,
    decisions,
    requestedAt: new Date(record.requested_at),
    expiresAt: record.expires_at
      ? new Date(record.expires_at)
      : null,
    completedAt: record.completed_at
      ? new Date(record.completed_at)
      : null,
    version: record.version,
    idempotencyKey: record.idempotency_key,
    correlationId: record.correlation_id,
    supersedesRequestId: record.supersedes_request_id,
  })
}
