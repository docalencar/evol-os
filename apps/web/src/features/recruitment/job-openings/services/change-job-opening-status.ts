import {
  ApproveRequest,
  CreateApprovalRequest,
  RejectRequest,
  createApprovalRequestRepository,
  getApprovalRequests,
} from "@/features/approval"

import {
  ApproveRecruitmentRequest,
  CreateRecruitmentApproval,
  RejectRecruitmentRequest,
} from "../integrations/approval"
import {
  createJobOpeningRepository,
} from "../repositories/job-opening-repository"
import type {
  ChangeJobOpeningStatusInput,
} from "../schemas/job-opening-schema"
import type {
  JobOpeningStatus,
} from "../types/job-opening"
import {
  recordJobOpeningActivity,
} from "./record-job-opening-activity"
import {
  validateJobOpeningRelations,
} from "./validate-job-opening-relations"

const ALLOWED_TRANSITIONS: Record<
  JobOpeningStatus,
  JobOpeningStatus[]
> = {
  draft: [
    "pending_approval",
    "cancelled",
  ],
  pending_approval: [
    "approved",
    "draft",
    "cancelled",
  ],
  approved: ["open", "cancelled"],
  open: [
    "paused",
    "filled",
    "closed",
    "cancelled",
  ],
  paused: [
    "open",
    "closed",
    "cancelled",
  ],
  closed: [],
  cancelled: [],
  filled: [],
}

export function getAllowedJobOpeningStatusTransitions(
  status: JobOpeningStatus
): JobOpeningStatus[] {
  return [...ALLOWED_TRANSITIONS[status]]
}

const STATUS_ACTIVITY: Partial<Record<
  JobOpeningStatus,
  {
    activityType: string
    title: string
  }
>> = {
  open: {
    activityType: "job_opening.opened",
    title: "Vaga aberta",
  },
  paused: {
    activityType: "job_opening.paused",
    title: "Vaga pausada",
  },
  closed: {
    activityType: "job_opening.closed",
    title: "Vaga encerrada",
  },
  cancelled: {
    activityType: "job_opening.cancelled",
    title: "Vaga cancelada",
  },
  filled: {
    activityType: "job_opening.filled",
    title: "Vaga preenchida",
  },
}

type ChangeJobOpeningStatusServiceInput = {
  companyId: string
  userId: string
  actorPersonId: string | null
  values: ChangeJobOpeningStatusInput
}

export async function changeJobOpeningStatus(
  input: ChangeJobOpeningStatusServiceInput
) {
  const repository =
    await createJobOpeningRepository()

  const existingResult =
    await repository.findById(
      input.companyId,
      input.values.jobOpeningId
    )

  if (existingResult.error) {
    throw new Error(
      "Não foi possível localizar a vaga."
    )
  }

  const existing = existingResult.data

  if (!existing) {
    throw new Error(
      "Vaga não encontrada."
    )
  }

  const allowedTransitions =
    getAllowedJobOpeningStatusTransitions(
      existing.status
    )

  if (
    !allowedTransitions.includes(
      input.values.status
    )
  ) {
    throw new Error(
      `Não é permitido alterar uma vaga ${existing.status} para ${input.values.status}.`
    )
  }

  if (input.values.status === "pending_approval") {
    if (!input.values.approverId) {
      throw new Error("Informe o aprovador da vaga.")
    }

    await validateJobOpeningRelations({
      companyId: input.companyId,
      approverId: input.values.approverId,
    })

    const approvalRepository =
      await createApprovalRequestRepository()

    return new CreateRecruitmentApproval(
      repository,
      new CreateApprovalRequest(approvalRepository),
      crypto.randomUUID
    ).execute({
      companyId: input.companyId,
      jobOpeningId: existing.id,
      approverId: input.values.approverId,
      requesterUserId: input.userId,
      requesterPersonId: input.actorPersonId,
      requestedAt: new Date(),
    })
  }

  if (
    existing.status === "pending_approval" &&
    input.values.status === "approved"
  ) {
    if (!input.actorPersonId) {
      throw new Error(
        "Não foi possível identificar a pessoa responsável pela aprovação."
      )
    }

    const approvalRepository =
      await createApprovalRequestRepository()

    return new ApproveRecruitmentRequest(
      repository,
      getApprovalRequests,
      new ApproveRequest(approvalRepository),
      crypto.randomUUID
    ).execute({
      companyId: input.companyId,
      jobOpeningId: existing.id,
      actorUserId: input.userId,
      actorPersonId: input.actorPersonId,
      occurredAt: new Date(),
    })
  }

  if (
    existing.status === "pending_approval" &&
    input.values.status === "draft"
  ) {
    if (!input.actorPersonId) {
      throw new Error(
        "Não foi possível identificar a pessoa responsável pela rejeição."
      )
    }

    const approvalRepository =
      await createApprovalRequestRepository()

    return new RejectRecruitmentRequest(
      repository,
      getApprovalRequests,
      new RejectRequest(approvalRepository),
      crypto.randomUUID
    ).execute({
      companyId: input.companyId,
      jobOpeningId: existing.id,
      actorUserId: input.userId,
      actorPersonId: input.actorPersonId,
      occurredAt: new Date(),
      reason: "Vaga devolvida para rascunho.",
    })
  }

  const approverId = existing.approverId
  const approvedAt = existing.approvedAt

  if (
    input.values.status === "open" &&
    (!existing.approvedAt ||
      !existing.approverId)
  ) {
    throw new Error(
      "A vaga precisa estar aprovada antes de ser aberta."
    )
  }

  const { data, error } =
    await repository.updateStatus({
      companyId: input.companyId,
      jobOpeningId:
        input.values.jobOpeningId,
      status: input.values.status,
      approverId,
      approvedAt,
    })

  if (error || !data) {
    throw new Error(
      "Não foi possível atualizar o status da vaga."
    )
  }

  const activity =
    STATUS_ACTIVITY[input.values.status]

  if (!activity) {
    throw new Error(
      "A transição de aprovação deve ser processada pelo Approval Framework."
    )
  }

  await recordJobOpeningActivity({
    companyId: input.companyId,
    userId: input.userId,
    jobOpening: data,
    activityType: activity.activityType,
    title: activity.title,
    description:
      `A vaga "${data.title}" mudou de ${existing.status} para ${data.status}.`,
    previousStatus: existing.status,
  })

  return data
}
