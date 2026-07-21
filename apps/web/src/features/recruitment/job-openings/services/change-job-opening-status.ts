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

const STATUS_ACTIVITY: Record<
  JobOpeningStatus,
  {
    activityType: string
    title: string
  }
> = {
  draft: {
    activityType:
      "job_opening.returned_to_draft",
    title: "Vaga devolvida para rascunho",
  },
  pending_approval: {
    activityType:
      "job_opening.submitted_for_approval",
    title: "Vaga enviada para aprovação",
  },
  approved: {
    activityType: "job_opening.approved",
    title: "Vaga aprovada",
  },
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
    ALLOWED_TRANSITIONS[existing.status]

  if (
    !allowedTransitions.includes(
      input.values.status
    )
  ) {
    throw new Error(
      `Não é permitido alterar uma vaga ${existing.status} para ${input.values.status}.`
    )
  }

  let approverId = existing.approverId
  let approvedAt = existing.approvedAt

  if (
    input.values.status ===
    "pending_approval"
  ) {
    if (!input.values.approverId) {
      throw new Error(
        "Informe o aprovador da vaga."
      )
    }

    await validateJobOpeningRelations({
      companyId: input.companyId,
      approverId:
        input.values.approverId,
    })

    approverId = input.values.approverId
    approvedAt = null
  }

  if (input.values.status === "approved") {
    if (!input.actorPersonId) {
      throw new Error(
        "Não foi possível identificar a pessoa responsável pela aprovação."
      )
    }

    await validateJobOpeningRelations({
      companyId: input.companyId,
      approverId: input.actorPersonId,
    })

    approverId = input.actorPersonId
    approvedAt = new Date().toISOString()
  }

  if (input.values.status === "draft") {
    approverId = null
    approvedAt = null
  }

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
