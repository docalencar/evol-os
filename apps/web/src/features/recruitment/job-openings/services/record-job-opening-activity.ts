import "server-only"

import {
  recordActivity,
} from "@/features/activity"

import type {
  JobOpening,
} from "../types/job-opening"

type RecordJobOpeningActivityInput = {
  companyId: string
  userId: string
  jobOpening: JobOpening
  activityType: string
  title: string
  description: string
  previousStatus?: string
}

export async function recordJobOpeningActivity(
  input: RecordJobOpeningActivityInput
): Promise<void> {
  try {
    await recordActivity({
      companyId: input.companyId,
      activityType: input.activityType,
      module: "recruitment",
      title: input.title,
      description: input.description,
      actorType: "user",
      actorId: input.userId,
      entityType: "job_opening",
      entityId: input.jobOpening.id,
      visibility: "company",
      metadata: {
        jobOpeningId:
          input.jobOpening.id,
        status: input.jobOpening.status,
        previousStatus:
          input.previousStatus ?? null,
      },
    })
  } catch (error) {
    console.error(
      "Erro ao registrar atividade da vaga:",
      error
    )
  }
}
