import "server-only"

import {
  createActivityRepository,
} from "../repositories/activity-repository"
import {
  presentActivities,
} from "../presenters/activity-presenter"
import type {
  ActivityRecord,
} from "../presenters/activity-presenter"
import type {
  ActivityViewModel,
} from "../view-models/activity-view-model"

export type GetActivitiesInput = {
  companyId: string
  limit?: number
  module?: string
  activityType?: string
  entityType?: string
  entityId?: string
  subjectType?: string
  subjectId?: string
}

export async function getActivities(
  input: GetActivitiesInput
): Promise<ActivityViewModel[]> {
  const repository =
    await createActivityRepository()

  const { data, error } =
    await repository.list({
      ...input,
      limit: Math.min(
        Math.max(input.limit ?? 50, 1),
        100
      ),
    })

  if (error) {
    throw new Error(
      `Não foi possível carregar as atividades: ${error.message}`
    )
  }

  return presentActivities(
    (data ?? []) as ActivityRecord[]
  )
}
