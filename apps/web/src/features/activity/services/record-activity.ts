import "server-only"

import {
  createActivityRepository,
} from "../repositories/activity-repository"
import {
  recordActivitySchema,
} from "../schemas/activity-schema"
import type {
  RecordActivityInput,
} from "../schemas/activity-schema"
import {
  presentActivity,
} from "../presenters/activity-presenter"
import type {
  ActivityViewModel,
} from "../view-models/activity-view-model"

export async function recordActivity(
  input: RecordActivityInput
): Promise<ActivityViewModel> {
  const validatedInput =
    recordActivitySchema.parse(input)

  const repository =
    await createActivityRepository()

  const { data, error } =
    await repository.create(validatedInput)

  if (error) {
    throw new Error(
      `Não foi possível registrar a atividade: ${error.message}`
    )
  }

  return presentActivity(data)
}
