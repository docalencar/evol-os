import "server-only"

import {
  createNotificationFromRule,
  defaultNotificationRule,
  resolveNotificationRecipients,
} from "@/features/notifications"

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

async function createActivityNotifications(
  activity: ActivityViewModel
): Promise<void> {
  try {
    const recipients =
      await resolveNotificationRecipients({
        companyId: activity.companyId,
        activityType: activity.activityType,
        activityEventId: activity.id,
        module: activity.module,
        actorId: activity.actorId,
        entityType: activity.entityType,
        entityId: activity.entityId,
        subjectType: activity.subjectType,
        subjectId: activity.subjectId,
        metadata: activity.metadata,
      })

    if (recipients.length === 0) {
      return
    }

    const message =
      activity.description ??
      activity.title

    const results =
      await Promise.all(
        recipients.map(({ recipientId }) =>
          createNotificationFromRule(
            defaultNotificationRule,
            {
              companyId:
                activity.companyId,
              recipientId,
              activityType:
                activity.activityType,
              activityEventId:
                activity.id,
              entityType:
                activity.entityType,
              entityId:
                activity.entityId,
              title:
                activity.title,
              message,
              metadata:
                activity.metadata,
            }
          )
        )
      )

    const errors =
      results
        .map((result) =>
          result.error?.message
        )
        .filter(
          (
            message
          ): message is string =>
            Boolean(message)
        )

    if (errors.length > 0) {
      console.error(
        "Não foi possível criar todas as notificações da atividade:",
        {
          activityEventId:
            activity.id,
          errors,
        }
      )
    }
  } catch (error) {
    console.error(
      "Erro ao processar notificações da atividade:",
      {
        activityEventId:
          activity.id,
        error,
      }
    )
  }
}

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

  const activity =
    presentActivity(data)

  await createActivityNotifications(
    activity
  )

  return activity
}
