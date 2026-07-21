import {
  createJobOpeningRepository,
} from "../repositories/job-opening-repository"
import type {
  UpdateJobOpeningInput,
} from "../schemas/job-opening-schema"
import {
  recordJobOpeningActivity,
} from "./record-job-opening-activity"
import {
  validateJobOpeningRelations,
} from "./validate-job-opening-relations"

type UpdateJobOpeningServiceInput = {
  companyId: string
  userId: string
  values: UpdateJobOpeningInput
}

export async function updateJobOpening(
  input: UpdateJobOpeningServiceInput
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

  if (existing.status !== "draft") {
    throw new Error(
      "Somente vagas em rascunho podem ser editadas."
    )
  }

  await validateJobOpeningRelations({
    companyId: input.companyId,
    departmentId:
      input.values.departmentId,
    positionId: input.values.positionId,
    requestingManagerId:
      input.values.requestingManagerId,
    recruiterId: input.values.recruiterId,
    replacedEmployeeId:
      input.values.replacedEmployeeId,
  })

  const {
    jobOpeningId,
    ...editableValues
  } = input.values

  const { data, error } =
    await repository.update({
      companyId: input.companyId,
      jobOpeningId,
      ...editableValues,
      status: existing.status,
      approverId: existing.approverId,
      approvedAt: existing.approvedAt,
    })

  if (error || !data) {
    throw new Error(
      "Não foi possível atualizar a vaga."
    )
  }

  await recordJobOpeningActivity({
    companyId: input.companyId,
    userId: input.userId,
    jobOpening: data,
    activityType: "job_opening.updated",
    title: "Vaga atualizada",
    description:
      `A vaga "${data.title}" foi atualizada.`,
  })

  return data
}
