import assert from "node:assert/strict"
import test from "node:test"

import {
  ApproveRequest,
  CancelRequest,
  CreateApprovalRequest,
  ExpireRequest,
  RejectRequest,
  WithdrawRequest,
} from ".."
import {
  ApprovalRequest,
  createApprovalActor,
  createApprovalContext,
  createApprovalPlanSnapshot,
  createApprovalSubjectRef,
} from "../../domain"
import type {
  ApprovalRequestRepository,
  ApprovalRequestRepositoryError,
  ApprovalRequestRepositoryResult,
} from "../../repositories/approval-request-repository-contract"

const requestId = "11111111-1111-4111-8111-111111111111"
const companyId = "22222222-2222-4222-8222-222222222222"
const stageId = "33333333-3333-4333-8333-333333333333"
const assignmentId = "44444444-4444-4444-8444-444444444444"
const decisionId = "55555555-5555-4555-8555-555555555555"
const requestedAt = new Date("2026-01-10T12:00:00.000Z")
const occurredAt = new Date("2026-01-10T13:00:00.000Z")
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

function createRequestInput(expiresAt?: Date) {
  return {
    id: requestId,
    subject: createApprovalSubjectRef({
      companyId,
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
      stages: [
        {
          stageId,
          sequence: 1,
          name: "Aprovação",
          assignments: [
            {
              assignmentId,
              principal: {
                principalType: "user" as const,
                principalId: "approver-user",
                displayNameSnapshot: "Aprovador",
              },
            },
          ],
        },
      ],
    }),
    requestedAt,
    expiresAt: expiresAt ?? null,
    idempotencyKey: "request-key",
  }
}

function createPersistedRequest(expiresAt?: Date): ApprovalRequest {
  const request = ApprovalRequest.request(
    createRequestInput(expiresAt)
  )
  request.clearPendingDomainEvents()
  return request
}

class FakeApprovalRequestRepository
  implements ApprovalRequestRepository
{
  request: ApprovalRequest | null
  saveError: ApprovalRequestRepositoryError | null = null
  saveCalls: Array<{
    approvalRequest: ApprovalRequest
    expectedVersion: number
  }> = []

  constructor(request: ApprovalRequest | null = null) {
    this.request = request
  }

  async findById(): Promise<
    ApprovalRequestRepositoryResult<ApprovalRequest | null>
  > {
    return { data: this.request, error: null }
  }

  async findAll(): Promise<
    ApprovalRequestRepositoryResult<ApprovalRequest[]>
  > {
    return {
      data: this.request ? [this.request] : [],
      error: null,
    }
  }

  async save(
    approvalRequest: ApprovalRequest,
    expectedVersion: number
  ): Promise<ApprovalRequestRepositoryResult<ApprovalRequest>> {
    this.saveCalls.push({ approvalRequest, expectedVersion })

    if (this.saveError) {
      return { data: null, error: this.saveError }
    }

    this.request = approvalRequest
    approvalRequest.clearPendingDomainEvents()
    return { data: approvalRequest, error: null }
  }
}

test("CreateApprovalRequest cria e persiste com versão esperada zero", async () => {
  const repository = new FakeApprovalRequestRepository()
  const service = new CreateApprovalRequest(repository)

  const result = await service.execute(createRequestInput())

  assert.equal(result.success, true)
  assert.equal(repository.saveCalls[0]?.expectedVersion, 0)
  assert.equal(repository.request?.version, 1)
})

test("ApproveRequest delega a decisão ao aggregate e preserva o lock", async () => {
  const repository = new FakeApprovalRequestRepository(
    createPersistedRequest()
  )
  const service = new ApproveRequest(repository)

  const result = await service.execute({
    companyId,
    approvalRequestId: requestId,
    expectedVersion: 1,
    actor: approver,
    occurredAt,
    decisionId,
    assignmentId,
    subjectVersion: "version-1",
    idempotencyKey: "decision-key",
  })

  assert.equal(result.success, true)
  assert.equal(repository.saveCalls[0]?.expectedVersion, 1)
  assert.equal(repository.request?.status, "approved")
})

test("RejectRequest delega rejeição e justificativa ao aggregate", async () => {
  const repository = new FakeApprovalRequestRepository(
    createPersistedRequest()
  )
  const service = new RejectRequest(repository)

  const result = await service.execute({
    companyId,
    approvalRequestId: requestId,
    expectedVersion: 1,
    actor: approver,
    occurredAt,
    decisionId,
    assignmentId,
    subjectVersion: "version-1",
    idempotencyKey: "decision-key",
    comment: "Contexto insuficiente.",
  })

  assert.equal(result.success, true)
  assert.equal(repository.request?.status, "rejected")
})

test("WithdrawRequest executa a retirada pelo solicitante", async () => {
  const repository = new FakeApprovalRequestRepository(
    createPersistedRequest()
  )
  const service = new WithdrawRequest(repository)

  const result = await service.execute({
    companyId,
    approvalRequestId: requestId,
    expectedVersion: 1,
    actor: requester,
    occurredAt,
    reason: "Solicitação desnecessária.",
  })

  assert.equal(result.success, true)
  assert.equal(repository.request?.status, "withdrawn")
})

test("CancelRequest executa o cancelamento no aggregate", async () => {
  const repository = new FakeApprovalRequestRepository(
    createPersistedRequest()
  )
  const service = new CancelRequest(repository)

  const result = await service.execute({
    companyId,
    approvalRequestId: requestId,
    expectedVersion: 1,
    actor: requester,
    occurredAt,
    reason: "Operação cancelada.",
  })

  assert.equal(result.success, true)
  assert.equal(repository.request?.status, "cancelled")
})

test("ExpireRequest executa expiração pelo ator de sistema", async () => {
  const expiresAt = new Date("2026-01-10T12:30:00.000Z")
  const repository = new FakeApprovalRequestRepository(
    createPersistedRequest(expiresAt)
  )
  const service = new ExpireRequest(repository)

  const result = await service.execute({
    companyId,
    approvalRequestId: requestId,
    expectedVersion: 1,
    actor: createApprovalActor({ actorType: "system" }),
    occurredAt,
  })

  assert.equal(result.success, true)
  assert.equal(repository.request?.status, "expired")
})

test("serviço retorna not_found sem tentar persistir", async () => {
  const repository = new FakeApprovalRequestRepository()
  const service = new ApproveRequest(repository)

  const result = await service.execute({
    companyId,
    approvalRequestId: requestId,
    expectedVersion: 1,
    actor: approver,
    occurredAt,
    decisionId,
    assignmentId,
    subjectVersion: "version-1",
    idempotencyKey: "decision-key",
  })

  assert.equal(result.success, false)
  assert.equal(result.success ? null : result.error.code, "not_found")
  assert.equal(repository.saveCalls.length, 0)
})

test("comando estruturalmente inválido não carrega nem persiste", async () => {
  const repository = new FakeApprovalRequestRepository(
    createPersistedRequest()
  )
  const service = new ApproveRequest(repository)

  const result = await service.execute({
    companyId: "invalid-company-id",
    approvalRequestId: requestId,
    expectedVersion: 1,
    actor: approver,
    occurredAt,
    decisionId,
    assignmentId,
    subjectVersion: "version-1",
    idempotencyKey: "decision-key",
  })

  assert.equal(result.success, false)
  assert.equal(result.success ? null : result.error.code, "invalid_input")
  assert.equal(repository.saveCalls.length, 0)
})

test("conflito de persistência mantém eventos pendentes", async () => {
  const request = createPersistedRequest()
  const repository = new FakeApprovalRequestRepository(request)
  repository.saveError = {
    code: "version_conflict",
    message: "Versão concorrente.",
  }
  const service = new ApproveRequest(repository)

  const result = await service.execute({
    companyId,
    approvalRequestId: requestId,
    expectedVersion: 1,
    actor: approver,
    occurredAt,
    decisionId,
    assignmentId,
    subjectVersion: "version-1",
    idempotencyKey: "decision-key",
  })

  assert.equal(result.success, false)
  assert.equal(
    result.success ? null : result.error.code,
    "version_conflict"
  )
  assert.ok(request.getPendingDomainEvents().length > 0)
})
