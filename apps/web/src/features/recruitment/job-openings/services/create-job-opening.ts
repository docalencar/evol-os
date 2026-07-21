import {
  createJobOpeningRepository,
} from "../repositories/job-opening-repository"
import type {
  CreateJobOpeningInput,
} from "../schemas/job-opening-schema"
import {
  recordJobOpeningActivity,
} from "./record-job-opening-activity"
import {
  validateJobOpeningRelations,
} from "./validate-job-opening-relations"

type CreateJobOpeningServiceInput = {
  companyId: string
  userId: string
  values: CreateJobOpeningInput
}

export async function createJobOpening(
  input: CreateJobOpeningServiceInput
) {
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

  const repository =
    await createJobOpeningRepository()

  const { data, error } =
    await repository.create({
      companyId: input.companyId,
      ...input.values,
      status: "draft",
      approverId: null,
      approvedAt: null,
      createdByUserId: input.userId,
    })

  if (error || !data) {
    throw new Error(
      "Não foi possível criar a vaga."
    )
  }

  await recordJobOpeningActivity({
    companyId: input.companyId,
    userId: input.userId,
    jobOpening: data,
    activityType: "job_opening.created",
    title: "Vaga criada",
    description:
      `A vaga "${data.title}" foi criada.`,
  })

  return data
}
