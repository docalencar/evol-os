import assert from "node:assert/strict"
import test from "node:test"

import type {
  ApprovalRequestApplicationResult,
  ApproveRequestCommand,
  CreateApprovalRequestCommand,
  RejectRequestCommand,
} from "../../../../../approval/public-api"
import {
  ApprovalRequest,
  createApprovalActor,
  createApprovalContext,
  createApprovalPlanSnapshot,
  createApprovalSubjectRef,
} from "../../../../../approval/domain"
import type {
  JobOpening,
  JobOpeningStatus,
} from "../../../types/job-opening"
import {
  ApproveRecruitmentRequest,
  CreateRecruitmentApproval,
  RejectRecruitmentRequest,
  type RecruitmentApprovalJobOpeningRepository,
} from "../recruitment-approval"

const companyId = "11111111-1111-4111-8111-111111111111"
const jobOpeningId = "22222222-2222-4222-8222-222222222222"
const approvalRequestId = "33333333-3333-4333-8333-333333333333"
const stageId = "44444444-4444-4444-8444-444444444444"
const assignmentId = "55555555-5555-4555-8555-555555555555"
const approverPersonId = "66666666-6666-4666-8666-666666666666"
const actorUserId = "77777777-7777-4777-8777-777777777777"
const occurredAt = new Date("2026-01-10T14:00:00.000Z")

function createJobOpening(
  status: JobOpeningStatus = "draft"
): JobOpening {
  return {
    id: jobOpeningId,
    companyId,
    title: "Pessoa Desenvolvedora",
    description: "Descrição",
    departmentId: "department-id",
    positionId: "position-id",
    requestingManagerId: "manager-id",
    recruiterId: null,
    openingReason: "new_position",
    replacedEmployeeId: null,
    openingJustification: "Expansão",
    positionsCount: 1,
    currentHeadcount: 1,
    targetHeadcount: 2,
    workModel: "remote",
    location: null,
    employmentType: "clt",
    salaryMin: null,
    salaryMax: null,
    status,
    priority: "high",
    targetHireDate: null,
    approverId:
      status === "pending_approval"
        ? approverPersonId
        : null,
    approvedAt: null,
    notes: null,
    estimatedMonthlyCost: null,
    isBudgeted: true,
    createdByUserId: actorUserId,
    createdAt: "2026-01-10T12:00:00.000Z",
    updatedAt: "2026-01-10T12:30:00.000Z",
    deletedAt: null,
  }
}

function createPendingApproval(): ApprovalRequest {
  const request = ApprovalRequest.request({
    id: approvalRequestId,
    subject: createApprovalSubjectRef({
      companyId,
      module: "recruitment",
      entityType: "job_opening",
      entityId: jobOpeningId,
      entityVersion: "2026-01-10T12:30:00.000Z",
    }),
    requester: createApprovalActor({
      actorType: "user",
      actorId: actorUserId,
    }),
    context: createApprovalContext({
      schemaVersion: "1",
      summary: "Aprovação da vaga",
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
                principalType: "person",
                principalId: approverPersonId,
                displayNameSnapshot: null,
              },
            },
          ],
        },
      ],
    }),
    requestedAt: new Date("2026-01-10T13:00:00.000Z"),
    idempotencyKey: "approval-key",
  })
  request.clearPendingDomainEvents()
  return request
}

class FakeJobOpeningRepository
  implements RecruitmentApprovalJobOpeningRepository
{
  jobOpening: JobOpening
  updates: Array<{
    status: JobOpeningStatus
    approverId: string | null
    approvedAt: string | null
  }> = []
  failUpdate = false

  constructor(jobOpening: JobOpening) {
    this.jobOpening = jobOpening
  }

  async findById() {
    return { data: this.jobOpening, error: null }
  }

  async updateStatus(input: {
    companyId: string
    jobOpeningId: string
    status: JobOpeningStatus
    approverId: string | null
    approvedAt: string | null
  }) {
    this.updates.push(input)

    if (this.failUpdate) {
      return { data: null, error: new Error("update failed") }
    }

    this.jobOpening = {
      ...this.jobOpening,
      status: input.status,
      approverId: input.approverId,
      approvedAt: input.approvedAt,
    }
    return { data: this.jobOpening, error: null }
  }
}

class FakeApprovalExecutor<TCommand> {
  command: TCommand | null = null

  constructor(
    private readonly result: ApprovalRequestApplicationResult
  ) {}

  async execute(command: TCommand) {
    this.command = command
    return this.result
  }
}

function successfulResult(
  request = createPendingApproval()
): ApprovalRequestApplicationResult {
  return {
    success: true,
    data: { approvalRequest: request },
  }
}

function idGenerator() {
  let current = 8
  return () =>
    `00000000-0000-4000-8000-${String(current++).padStart(12, "0")}`
}

test("cria solicitação pelo Approval e sincroniza pending_approval", async () => {
  const repository = new FakeJobOpeningRepository(createJobOpening())
  const executor = new FakeApprovalExecutor<CreateApprovalRequestCommand>(
    successfulResult()
  )
  const service = new CreateRecruitmentApproval(
    repository,
    executor,
    idGenerator()
  )

  const result = await service.execute({
    companyId,
    jobOpeningId,
    approverId: approverPersonId,
    requesterUserId: actorUserId,
    requesterPersonId: "requester-person",
    requestedAt: occurredAt,
  })

  assert.equal(executor.command?.subject.module, "recruitment")
  assert.equal(executor.command?.subject.entityType, "job_opening")
  assert.equal(
    executor.command?.planSnapshot.stages[0]?.assignments[0]
      ?.principal.principalId,
    approverPersonId
  )
  assert.equal(result.status, "pending_approval")
  assert.equal(result.approverId, approverPersonId)
})

test("aprova exclusivamente pelo Approval e sincroniza a vaga", async () => {
  const request = createPendingApproval()
  const repository = new FakeJobOpeningRepository(
    createJobOpening("pending_approval")
  )
  const executor = new FakeApprovalExecutor<ApproveRequestCommand>(
    successfulResult(request)
  )
  const service = new ApproveRecruitmentRequest(
    repository,
    async () => [request],
    executor,
    idGenerator()
  )

  const result = await service.execute({
    companyId,
    jobOpeningId,
    actorUserId,
    actorPersonId: approverPersonId,
    occurredAt,
  })

  assert.equal(executor.command?.approvalRequestId, approvalRequestId)
  assert.equal(executor.command?.expectedVersion, 1)
  assert.equal(executor.command?.assignmentId, assignmentId)
  assert.equal(result.status, "approved")
  assert.equal(result.approvedAt, occurredAt.toISOString())
})

test("rejeita pelo Approval e devolve a vaga para draft", async () => {
  const request = createPendingApproval()
  const repository = new FakeJobOpeningRepository(
    createJobOpening("pending_approval")
  )
  const executor = new FakeApprovalExecutor<RejectRequestCommand>(
    successfulResult(request)
  )
  const service = new RejectRecruitmentRequest(
    repository,
    async () => [request],
    executor,
    idGenerator()
  )

  const result = await service.execute({
    companyId,
    jobOpeningId,
    actorUserId,
    actorPersonId: approverPersonId,
    occurredAt,
    reason: "Orçamento não aprovado.",
  })

  assert.equal(executor.command?.comment, "Orçamento não aprovado.")
  assert.equal(result.status, "draft")
  assert.equal(result.approverId, null)
  assert.equal(result.approvedAt, null)
})

test("erro de aprovação não altera o status da vaga", async () => {
  const request = createPendingApproval()
  const repository = new FakeJobOpeningRepository(
    createJobOpening("pending_approval")
  )
  const executor = new FakeApprovalExecutor<ApproveRequestCommand>({
    success: false,
    error: {
      code: "domain_error",
      message: "Ator não autorizado.",
    },
  })
  const service = new ApproveRecruitmentRequest(
    repository,
    async () => [request],
    executor,
    idGenerator()
  )

  await assert.rejects(
    service.execute({
      companyId,
      jobOpeningId,
      actorUserId,
      actorPersonId: "other-person",
      occurredAt,
    }),
    /Ator não autorizado/
  )
  assert.equal(repository.updates.length, 0)
  assert.equal(repository.jobOpening.status, "pending_approval")
})

test("falha de sincronização é reportada após sucesso da aprovação", async () => {
  const request = createPendingApproval()
  const repository = new FakeJobOpeningRepository(
    createJobOpening("pending_approval")
  )
  repository.failUpdate = true
  const executor = new FakeApprovalExecutor<ApproveRequestCommand>(
    successfulResult(request)
  )
  const service = new ApproveRecruitmentRequest(
    repository,
    async () => [request],
    executor,
    idGenerator()
  )

  await assert.rejects(
    service.execute({
      companyId,
      jobOpeningId,
      actorUserId,
      actorPersonId: approverPersonId,
      occurredAt,
    }),
    /não foi possível sincronizar o status/
  )
})
