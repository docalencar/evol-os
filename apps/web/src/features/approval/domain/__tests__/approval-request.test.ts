import assert from "node:assert/strict"
import test from "node:test"

import {
  ApprovalDomainError,
  ApprovalRequest,
  createApprovalActor,
  createApprovalContext,
  createApprovalPlanSnapshot,
  createApprovalSubjectRef,
} from ".."

const requestedAt = new Date("2026-01-10T12:00:00.000Z")
const requester = createApprovalActor({
  actorType: "user",
  actorId: "requester-user",
  personId: "requester-person",
})
const approver = createApprovalActor({
  actorType: "user",
  actorId: "approver-user",
  personId: "approver-person",
})

function createRequest(stageCount = 1): ApprovalRequest {
  return ApprovalRequest.request({
    id: "11111111-1111-4111-8111-111111111111",
    subject: createApprovalSubjectRef({
      companyId: "22222222-2222-4222-8222-222222222222",
      module: "tests",
      entityType: "test_entity",
      entityId: "entity-1",
      entityVersion: "version-1",
    }),
    requester,
    context: createApprovalContext({
      schemaVersion: "1",
      summary: "Solicitação de teste",
      metadata: {},
    }),
    planSnapshot: createApprovalPlanSnapshot({
      stages: Array.from({ length: stageCount }, (_, index) => ({
        stageId: `stage-${index + 1}`,
        sequence: index + 1,
        name: `Etapa ${index + 1}`,
        assignments: [
          {
            assignmentId: `assignment-${index + 1}`,
            principal: {
              principalType: "user",
              principalId: "approver-user",
              displayNameSnapshot: "Aprovador",
            },
          },
        ],
      })),
    }),
    requestedAt,
    idempotencyKey: "request-key",
  })
}

test("request cria o aggregate e publica somente os eventos iniciais", () => {
  const request = createRequest()

  assert.equal(request.status, "pending")
  assert.equal(request.version, 1)
  assert.deepEqual(
    request.getPendingDomainEvents().map((event) => event.eventType),
    [
      "approval.requested",
      "approval.stage.activated",
      "approval.assigned",
    ]
  )
})

test("restore reidrata o aggregate sem republicar eventos históricos", () => {
  const original = createRequest()

  const restored = ApprovalRequest.restore({
    id: original.id,
    subject: original.subject,
    requester: original.requester,
    context: original.context,
    planSnapshot: original.planSnapshot,
    status: original.status,
    stages: original.stages.map((stage) => ({
      id: stage.id,
      sequence: stage.sequence,
      name: stage.name,
      decisionRule: stage.decisionRule,
      status: stage.status,
      assignments: stage.assignments.map((assignment) => ({
        id: assignment.id,
        stageId: assignment.stageId,
        principal: assignment.principal,
        status: assignment.status,
        assignedAt: assignment.assignedAt,
        decidedAt: assignment.decidedAt,
        revokedAt: assignment.revokedAt,
      })),
      startedAt: stage.startedAt,
      completedAt: stage.completedAt,
    })),
    decisions: [...original.decisions],
    requestedAt: original.requestedAt,
    expiresAt: original.expiresAt,
    completedAt: original.completedAt,
    version: original.version,
    idempotencyKey: original.idempotencyKey,
    correlationId: original.correlationId,
    supersedesRequestId: original.supersedesRequestId,
  })

  assert.equal(restored.getPendingDomainEvents().length, 0)
  assert.equal(restored.version, original.version)
})

test("eventos pendentes só são removidos explicitamente", () => {
  const request = createRequest()
  const initialEvents = request.getPendingDomainEvents()

  assert.equal(request.getPendingDomainEvents().length, initialEvents.length)

  request.clearPendingDomainEvents()

  assert.equal(request.getPendingDomainEvents().length, 0)
})

test("aprovação percorre as etapas e preserva decisões anteriores", () => {
  const request = createRequest(2)
  request.clearPendingDomainEvents()

  request.decide({
    decisionId: "decision-1",
    assignmentId: "assignment-1",
    actor: approver,
    outcome: "approved",
    decidedAt: new Date("2026-01-10T13:00:00.000Z"),
    subjectVersion: "version-1",
    expectedVersion: 1,
    idempotencyKey: "decision-key-1",
  })

  assert.equal(request.version, 2)
  assert.equal(request.status, "pending")
  assert.equal(request.decisions.length, 1)
  assert.equal(request.stages[1]?.status, "active")

  request.decide({
    decisionId: "decision-2",
    assignmentId: "assignment-2",
    actor: approver,
    outcome: "approved",
    decidedAt: new Date("2026-01-10T14:00:00.000Z"),
    subjectVersion: "version-1",
    expectedVersion: 2,
    idempotencyKey: "decision-key-2",
  })

  assert.equal(request.version, 3)
  assert.equal(request.status, "approved")
  assert.deepEqual(
    request.decisions.map((decision) => decision.id),
    ["decision-1", "decision-2"]
  )
})

test("decisão rejeitada exige justificativa", () => {
  const request = createRequest()

  assert.throws(
    () =>
      request.decide({
        decisionId: "decision-1",
        assignmentId: "assignment-1",
        actor: approver,
        outcome: "rejected",
        comment: " ",
        decidedAt: new Date("2026-01-10T13:00:00.000Z"),
        subjectVersion: "version-1",
        expectedVersion: 1,
        idempotencyKey: "decision-key-1",
      }),
    (error: unknown) =>
      error instanceof ApprovalDomainError &&
      error.code === "reason_required"
  )
})

test("decisão rejeita ator não atribuído", () => {
  const request = createRequest()
  const otherActor = createApprovalActor({
    actorType: "user",
    actorId: "other-user",
  })

  assert.throws(
    () =>
      request.decide({
        decisionId: "decision-1",
        assignmentId: "assignment-1",
        actor: otherActor,
        outcome: "approved",
        decidedAt: new Date("2026-01-10T13:00:00.000Z"),
        subjectVersion: "version-1",
        expectedVersion: 1,
        idempotencyKey: "decision-key-1",
      }),
    (error: unknown) =>
      error instanceof ApprovalDomainError &&
      error.code === "actor_not_assigned"
  )
})

test("transição rejeita versão esperada desatualizada", () => {
  const request = createRequest()

  assert.throws(
    () =>
      request.decide({
        decisionId: "decision-1",
        assignmentId: "assignment-1",
        actor: approver,
        outcome: "approved",
        decidedAt: new Date("2026-01-10T13:00:00.000Z"),
        subjectVersion: "version-1",
        expectedVersion: 0,
        idempotencyKey: "decision-key-1",
      }),
    (error: unknown) =>
      error instanceof ApprovalDomainError &&
      error.code === "invalid_transition"
  )
})

test("somente o solicitante pode retirar uma solicitação", () => {
  const request = createRequest()

  assert.throws(
    () =>
      request.withdraw({
        actor: approver,
        reason: "Não é o solicitante",
        occurredAt: new Date("2026-01-10T13:00:00.000Z"),
        expectedVersion: 1,
      }),
    (error: unknown) =>
      error instanceof ApprovalDomainError &&
      error.code === "actor_not_requester"
  )
})
