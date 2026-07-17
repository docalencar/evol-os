import type {
  Notification,
} from "../types/notification"
import {
  createNotificationSchema,
  type CreateNotificationInput,
} from "../schemas/notification-schema"
import {
  createNotificationRepository,
} from "../repositories/notification-repository"

export type CreateNotificationResult = {
  data: Notification | null
  error: {
    message: string
  } | null
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<CreateNotificationResult> {
  const parsedInput =
    createNotificationSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      data: null,
      error: {
        message:
          "Dados inválidos para criar notificação.",
      },
    }
  }

  const repository =
    await createNotificationRepository()

  const { data, error } =
    await repository.create(
      parsedInput.data
    )

  if (error) {
    return {
      data: null,
      error: {
        message: error.message,
      },
    }
  }

  return {
    data,
    error: null,
  }
}
