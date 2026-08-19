import type {
  ApprovalApplicationResult,
  ApprovalDecisionSubmissionPayload,
  ApprovalRequest,
  ApprovalRequestApplicationResult,
  ApprovalRequestPersistenceRecord,
  ApprovalRequestSubmissionPayload,
  BuildApprovalDecisionInput,
  CreateApprovalRequestCommand,
  RejectRequestCommand,
} from "../../../../approval/public-api"

import type {
  JobOpening,
  JobOpeningStatus,
} from "../../types/job-opening"

type RepositoryResult<T> = {
  data: T | null
  error: unknown | null
}

export type RecruitmentApprovalJobOpeningRepository = {
  findById(
    companyId: string,
    jobOpeningId: string
  ): Promise<RepositoryResult<JobOpening>>
  submitForApproval(input: {
    companyId: string
    jobOpeningId: string
    aggregate: unknown
    events: unknown
  }): Promise<RepositoryResult<JobOpening>>
  loadPendingApproval(
    companyId: string,
    jobOpeningId: string
  ): Promise<RepositoryResult<ApprovalRequestPersistenceRecord>>
  approve(input: {
    companyId: string
    jobOpeningId: string
    aggregate: unknown
    events: unknown
    expectedVersion: number
  }): Promise<RepositoryResult<JobOpening>>
  updateStatus(input: {
    companyId: string
    jobOpeningId: string
    status: JobOpeningStatus
    approverId: string | null
    approvedAt: string | null
  }): Promise<RepositoryResult<JobOpening>>
}

type ApprovalExecutor<TCommand> = {
  execute(
    command: TCommand
  ): Promise<ApprovalRequestApplicationResult>
}

// Builds the serialized approval aggregate + domain events from the framework
// (ApprovalRequest.request + the framework serializers) without persisting.
export type BuildApprovalRequestSubmission = (
  command: CreateApprovalRequestCommand
) => ApprovalApplicationResult<ApprovalRequestSubmissionPayload>

// Rehydrates an existing approval request, runs the framework decision rule and
// serializes the decided aggregate + events (with the original expected_version).
export type BuildApprovalDecisionSubmission = (
  input: BuildApprovalDecisionInput
) => ApprovalApplicationResult<ApprovalDecisionSubmissionPayload>

export type FindRecruitmentApprovalRequests = (input: {
  companyId: string
  module: string
  entityType: string
  entityId: string
}) => Promise<ApprovalRequest[]>

type CreateRecruitmentApprovalCommand = {
  companyId: string
  jobOpeningId: string
  approverId: string
  requesterUserId: string
  requesterPersonId: string | null
  requestedAt: Date
}

type DecideRecruitmentApprovalCommand = {
  companyId: string
  jobOpeningId: string
  actorUserId: string
  actorPersonId: string
  occurredAt: Date
}

export type RejectRecruitmentApprovalCommand =
  DecideRecruitmentApprovalCommand & {
    reason: string
  }

type IdGenerator = () => string

function applicationFailure(
  result: Exclude<
    ApprovalRequestApplicationResult,
    { success: true }
  >
): Error {
  return new Error(result.error.message)
}

async function requireJobOpening(
  repository: RecruitmentApprovalJobOpeningRepository,
  companyId: string,
  jobOpeningId: string
): Promise<JobOpening> {
  const result = await repository.findById(
    companyId,
    jobOpeningId
  )

  if (result.error || !result.data) {
    throw new Error("Vaga não encontrada.")
  }

  return result.data
}

async function synchronizeStatus(
  repository: RecruitmentApprovalJobOpeningRepository,
  input: {
    companyId: string
    jobOpeningId: string
    status: JobOpeningStatus
    approverId: string | null
    approvedAt: string | null
  }
): Promise<JobOpening> {
  const result = await repository.updateStatus(input)

  if (result.error || !result.data) {
    throw new Error(
      "A aprovação foi processada, mas não foi possível sincronizar o status da vaga."
    )
  }

  return result.data
}

async function requirePendingApproval(
  findApprovalRequests: FindRecruitmentApprovalRequests,
  companyId: string,
  jobOpeningId: string
): Promise<ApprovalRequest> {
  const requests = await findApprovalRequests({
    companyId,
    module: "recruitment",
    entityType: "job_opening",
    entityId: jobOpeningId,
  })
  const request = requests.find(
    (candidate) => candidate.status === "pending"
  )

  if (!request) {
    throw new Error(
      "Não existe uma solicitação de aprovação pendente para esta vaga."
    )
  }

  return request
}

function requireActiveAssignment(
  request: ApprovalRequest
) {
  const activeStage = request.stages.find(
    (stage) => stage.status === "active"
  )
  const assignment = activeStage?.assignments.find(
    (candidate) => candidate.status === "assigned"
  )

  if (!assignment) {
    throw new Error(
      "A solicitação não possui um aprovador ativo."
    )
  }

  return assignment
}

export class CreateRecruitmentApproval {
  constructor(
    private readonly jobOpenings: RecruitmentApprovalJobOpeningRepository,
    private readonly buildSubmission: BuildApprovalRequestSubmission,
    private readonly generateId: IdGenerator
  ) {}

  async execute(
    command: CreateRecruitmentApprovalCommand
  ): Promise<JobOpening> {
    const jobOpening = await requireJobOpening(
      this.jobOpenings,
      command.companyId,
      command.jobOpeningId
    )

    if (jobOpening.status !== "draft") {
      throw new Error(
        "Somente vagas em rascunho podem ser enviadas para aprovação."
      )
    }

    // Reuse the Approval Framework to construct + serialize the aggregate and
    // its domain events (no reconstruction/duplication of the engine here).
    const built = this.buildSubmission({
      id: this.generateId(),
      subject: {
        companyId: command.companyId,
        module: "recruitment",
        entityType: "job_opening",
        entityId: jobOpening.id,
        entityVersion: jobOpening.updatedAt,
        snapshotFingerprint: null,
      },
      requester: {
        actorType: "user",
        actorId: command.requesterUserId,
        personId: command.requesterPersonId,
        displayNameSnapshot: null,
      },
      context: {
        schemaVersion: "1",
        summary: `Aprovação da vaga ${jobOpening.title}`,
        metadata: {
          jobOpeningId: jobOpening.id,
          title: jobOpening.title,
          priority: jobOpening.priority,
        },
      },
      planSnapshot: {
        policyId: null,
        policyVersion: null,
        stages: [
          {
            stageId: this.generateId(),
            sequence: 1,
            name: "Aprovação da vaga",
            decisionRule: "any",
            assignments: [
              {
                assignmentId: this.generateId(),
                principal: {
                  principalType: "person",
                  principalId: command.approverId,
                  displayNameSnapshot: null,
                },
              },
            ],
          },
        ],
      },
      requestedAt: command.requestedAt,
      expiresAt: null,
      idempotencyKey:
        `recruitment:job-opening:${jobOpening.id}:approval:${jobOpening.updatedAt}`,
      correlationId: jobOpening.id,
      supersedesRequestId: null,
    })

    if (built.success === false) {
      throw applicationFailure(built)
    }

    // Single atomic boundary: persist the approval aggregate through the engine
    // AND transition draft -> pending_approval in one transaction.
    const result = await this.jobOpenings.submitForApproval({
      companyId: command.companyId,
      jobOpeningId: jobOpening.id,
      aggregate: built.data.aggregate,
      events: built.data.events,
    })

    if (result.error || !result.data) {
      throw new Error(
        "Não foi possível enviar a vaga para aprovação."
      )
    }

    return result.data
  }
}

export class ApproveRecruitmentRequest {
  constructor(
    private readonly jobOpenings: RecruitmentApprovalJobOpeningRepository,
    private readonly buildDecision: BuildApprovalDecisionSubmission,
    private readonly generateId: IdGenerator
  ) {}

  async execute(
    command: DecideRecruitmentApprovalCommand
  ): Promise<JobOpening> {
    // Load the pending approval aggregate via the safe read boundary (0096).
    const loaded = await this.jobOpenings.loadPendingApproval(
      command.companyId,
      command.jobOpeningId
    )

    if (loaded.error) {
      throw new Error(
        "Não foi possível carregar a aprovação da vaga."
      )
    }

    const record = loaded.data

    if (!record) {
      throw new Error(
        "Não existe uma solicitação de aprovação pendente para esta vaga."
      )
    }

    // The framework rehydrates the aggregate, runs the decision rule and
    // serializes it; expectedVersion is the original (pre-decision) version.
    const built = this.buildDecision({
      record,
      decisionId: this.generateId(),
      actor: {
        actorType: "user",
        actorId: command.actorUserId,
        personId: command.actorPersonId,
        displayNameSnapshot: null,
      },
      outcome: "approved",
      occurredAt: command.occurredAt,
      idempotencyKey:
        `recruitment:job-opening:${command.jobOpeningId}:approve:${record.version}`,
    })

    if (built.success === false) {
      throw applicationFailure(built)
    }

    // Single atomic boundary: persist the decision through the engine (with the
    // original expected_version) AND transition pending_approval -> approved.
    const result = await this.jobOpenings.approve({
      companyId: command.companyId,
      jobOpeningId: command.jobOpeningId,
      aggregate: built.data.aggregate,
      events: built.data.events,
      expectedVersion: built.data.expectedVersion,
    })

    if (result.error || !result.data) {
      throw new Error("Não foi possível aprovar a vaga.")
    }

    return result.data
  }
}

export class RejectRecruitmentRequest {
  constructor(
    private readonly jobOpenings: RecruitmentApprovalJobOpeningRepository,
    private readonly findApprovalRequests: FindRecruitmentApprovalRequests,
    private readonly rejectRequest: ApprovalExecutor<RejectRequestCommand>,
    private readonly generateId: IdGenerator
  ) {}

  async execute(
    command: RejectRecruitmentApprovalCommand
  ): Promise<JobOpening> {
    const jobOpening = await requireJobOpening(
      this.jobOpenings,
      command.companyId,
      command.jobOpeningId
    )
    const request = await requirePendingApproval(
      this.findApprovalRequests,
      command.companyId,
      jobOpening.id
    )
    const assignment = requireActiveAssignment(request)
    const result = await this.rejectRequest.execute({
      companyId: command.companyId,
      approvalRequestId: request.id,
      expectedVersion: request.version,
      actor: {
        actorType: "user",
        actorId: command.actorUserId,
        personId: command.actorPersonId,
        displayNameSnapshot: null,
      },
      occurredAt: command.occurredAt,
      decisionId: this.generateId(),
      assignmentId: assignment.id,
      subjectVersion: request.subject.entityVersion,
      idempotencyKey:
        `recruitment:job-opening:${jobOpening.id}:reject:${request.version}`,
      comment: command.reason,
    })

    if (result.success === false) {
      throw applicationFailure(result)
    }

    return synchronizeStatus(this.jobOpenings, {
      companyId: command.companyId,
      jobOpeningId: jobOpening.id,
      status: "draft",
      approverId: null,
      approvedAt: null,
    })
  }
}
