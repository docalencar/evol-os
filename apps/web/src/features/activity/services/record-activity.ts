import "server-only"

import {
  loadCurrentUserContext,
} from "@/features/authorization"
import {
  createActivityNotificationProcessor,
} from "@/features/notifications/server"
import {
  createServerDatabase,
} from "@/lib/database/server-database"

import {
  presentActivity,
} from "../presenters/activity-presenter"
import {
  createActivityRepository,
} from "../repositories/activity-repository"
import {
  recordActivitySchema,
} from "../schemas/activity-schema"
import type {
  RecordActivityInput,
} from "../schemas/activity-schema"
import type {
  ActivityViewModel,
} from "../view-models/activity-view-model"

export async function recordActivity(
  input: RecordActivityInput
): Promise<ActivityViewModel> {
  const parsedInput =
    recordActivitySchema.parse(input)

  const currentUser = await loadCurrentUserContext(
    await createServerDatabase()
  )
  if (currentUser.companyId !== parsedInput.companyId) {
    throw new Error("A atividade não pertence à empresa do usuário atual.")
  }

  const validatedInput = {
    ...parsedInput,
    actorId: parsedInput.actorType === "user"
      ? currentUser.userId
      : parsedInput.actorId,
  }

  const repository =
    await createActivityRepository()

  const { data, error } =
    await repository.create(validatedInput)

  if (error) {
    throw new Error(
      `Não foi possível registrar a atividade: ${error.message}`
    )
  }

  const activity =
    presentActivity(data)

  try {
    const processor = await createActivityNotificationProcessor()
    await processor.execute({
      id: activity.id,
      companyId: activity.companyId,
      activityType: activity.activityType,
      module: activity.module,
      title: activity.title,
      description: activity.description,
      actorId: activity.actorId,
      entityType: activity.entityType,
      entityId: activity.entityId,
      subjectType: activity.subjectType,
      subjectId: activity.subjectId,
      visibility: activity.visibility,
      metadata: activity.metadata,
      occurredAt: activity.occurredAt,
    })
  } catch (error) {
    console.error("Erro ao persistir o Notification Event da atividade:", {
      activityEventId: activity.id,
      error,
    })
  }

  return activity
}
