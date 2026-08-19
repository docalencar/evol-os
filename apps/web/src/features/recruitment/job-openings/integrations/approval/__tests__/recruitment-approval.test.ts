import assert from "node:assert/strict"
import test from "node:test"

import type {
  ApprovalDecisionSubmissionPayload,
  ApprovalRequestApplicationResult,
  ApprovalRequestPersistenceRecord,
  BuildApprovalDecisionInput,
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
  buildApprovalRequestSubmission,
} from "../../../../../approval/public-api"
import {
  ApproveRecruitmentRequest,
  type BuildApprovalDecisionSubmission,
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
  submissions: Array<{ aggregate: unknown; events: unknown }> = []
  approvals: Array<{
    aggregate: unknown
    events: unknown
    expectedVersion: number
  }> = []
  pendingRecord: ApprovalRequestPersistenceRecord | null = null
  failLoadPending = false
  failApprove = false

  constructor(jobOpening: JobOpening) {
    this.jobOpening = jobOpening
  }

  async findById() {
    return { data: this.jobOpening, error: null }
  }

  async loadPendingApproval() {
    if (this.failLoadPending) {
      return { data: null, error: new Error("load failed") }
    }
    return { data: this.pendingRecord, error: null }
  }

  async approve(input: {
    companyId: string
    jobOpeningId: string
    aggregate: unknown
    events: unknown
    expectedVersion: number
  }) {
    this.approvals.push({
      aggregate: input.aggregate,
      events: input.events,
      expectedVersion: input.expectedVersion,
    })

    if (this.failApprove) {
      return { data: null, error: new Error("approve failed") }
    }

    this.jobOpening = {
      ...this.jobOpening,
      status: "approved",
      approverId: approverPersonId,
      approvedAt: "2026-01-10T14:00:00.000Z",
    }
    return { data: this.jobOpening, error: null }
  }

  async submitForApproval(input: {
    companyId: string
    jobOpeningId: string
    aggregate: unknown
    events: unknown
  }) {
    this.submissions.push({
      aggregate: input.aggregate,
      events: input.events,
    })
    this.jobOpening = {
      ...this.jobOpening,
      status: "pending_approval",
      approverId: approverPersonId,
      approvedAt: null,
    }
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
  // Reuse the real Approval Framework builder: it constructs + serializes the
  // aggregate/events, and persistence goes through the atomic submit boundary.
  const service = new CreateRecruitmentApproval(
    repository,
    buildApprovalRequestSubmission,
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

  assert.equal(repository.submissions.length, 1)
  const aggregate = repository.submissions[0]?.aggregate as {
    request: {
      module: string
      entity_type: string
      entity_id: string
    }
    assignments: Array<{ principal_id: string }>
  }
  assert.equal(aggregate.request.module, "recruitment")
  assert.equal(aggregate.request.entity_type, "job_opening")
  assert.equal(aggregate.request.entity_id, jobOpeningId)
  assert.equal(
    aggregate.assignments[0]?.principal_id,
    approverPersonId
  )
  assert.equal(result.status, "pending_approval")
})

test("aprova pela read boundary + framework + approve boundary atômica", async () => {
  const repository = new FakeJobOpeningRepository(
    createJobOpening("pending_approval")
  )
  repository.pendingRecord = {
    version: 3,
  } as unknown as ApprovalRequestPersistenceRecord

  const decisionInputs: BuildApprovalDecisionInput[] = []
  const buildDecision: BuildApprovalDecisionSubmission = (input) => {
    decisionInputs.push(input)
    return {
      success: true,
      data: {
        aggregate: {
          marker: "decided",
        } as unknown as ApprovalDecisionSubmissionPayload["aggregate"],
        events: [],
        expectedVersion: 3,
      },
    }
  }

  const service = new ApproveRecruitmentRequest(
    repository,
    buildDecision,
    idGenerator()
  )

  const result = await service.execute({
    companyId,
    jobOpeningId,
    actorUserId,
    actorPersonId: approverPersonId,
    occurredAt,
  })

  // The framework decision is built from the loaded record, as an approval.
  assert.equal(decisionInputs.length, 1)
  const captured = decisionInputs[0]
  assert.equal(captured?.outcome, "approved")
  assert.equal(captured?.actor.personId, approverPersonId)
  assert.equal(
    captured?.idempotencyKey,
    `recruitment:job-opening:${jobOpeningId}:approve:3`
  )
  // The ORIGINAL expected_version is forwarded to the atomic approve boundary.
  assert.equal(repository.approvals.length, 1)
  assert.equal(repository.approvals[0]?.expectedVersion, 3)
  // No legacy status write path is used.
  assert.equal(repository.updates.length, 0)
  assert.equal(result.status, "approved")
})

test("aprovação falha fechado sem approval request pendente", async () => {
  const repository = new FakeJobOpeningRepository(
    createJobOpening("pending_approval")
  )
  repository.pendingRecord = null
  const buildDecision: BuildApprovalDecisionSubmission = () => {
    throw new Error("build should not run without a pending request")
  }
  const service = new ApproveRecruitmentRequest(
    repository,
    buildDecision,
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
    /Não existe uma solicitação de aprovação pendente/
  )
  assert.equal(repository.approvals.length, 0)
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

test("decisão de domínio inválida não aprova a vaga", async () => {
  const repository = new FakeJobOpeningRepository(
    createJobOpening("pending_approval")
  )
  repository.pendingRecord = {
    version: 1,
  } as unknown as ApprovalRequestPersistenceRecord
  const buildDecision: BuildApprovalDecisionSubmission = () => ({
    success: false,
    error: {
      code: "domain_error",
      message: "Ator não autorizado.",
    },
  })
  const service = new ApproveRecruitmentRequest(
    repository,
    buildDecision,
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
  assert.equal(repository.approvals.length, 0)
  assert.equal(repository.jobOpening.status, "pending_approval")
})

test("erro da approve boundary é reportado e não aprova a vaga", async () => {
  const repository = new FakeJobOpeningRepository(
    createJobOpening("pending_approval")
  )
  repository.pendingRecord = {
    version: 1,
  } as unknown as ApprovalRequestPersistenceRecord
  repository.failApprove = true
  const buildDecision: BuildApprovalDecisionSubmission = () => ({
    success: true,
    data: {
      aggregate:
        {} as unknown as ApprovalDecisionSubmissionPayload["aggregate"],
      events: [],
      expectedVersion: 1,
    },
  })
  const service = new ApproveRecruitmentRequest(
    repository,
    buildDecision,
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
    /Não foi possível aprovar a vaga/
  )
  assert.equal(repository.jobOpening.status, "pending_approval")
})
