import {
  NOTIFICATION_STATUSES,
} from "../constants/notification-constants"
import {
  createNotificationRepository,
} from "../repositories/notification-repository"
import {
  presentNotifications,
} from "../presenters/notification-presenter"
import type {
  NotificationStatus,
} from "../types/notification"
import type {
  NotificationViewModel,
} from "../view-models/notification-view-model"

export type GetNotificationsInput = {
  companyId: string
  recipientId: string
  status?: NotificationStatus
  limit?: number
  offset?: number
}

export type GetNotificationsResult = {
  data: NotificationViewModel[]
  error: {
    message: string
  } | null
}

function isNotificationStatus(
  value: string
): value is NotificationStatus {
  return (
    NOTIFICATION_STATUSES as readonly string[]
  ).includes(value)
}

export async function getNotifications(
  input: GetNotificationsInput
): Promise<GetNotificationsResult> {
  if (
    !input.companyId ||
    !input.recipientId
  ) {
    return {
      data: [],
      error: {
        message:
          "Empresa e destinatário são obrigatórios.",
      },
    }
  }

  if (
    input.status &&
    !isNotificationStatus(
      input.status
    )
  ) {
    return {
      data: [],
      error: {
        message:
          "Status de notificação inválido.",
      },
    }
  }

  const repository =
    await createNotificationRepository()

  const { data, error } =
    await repository.findAllByRecipient({
      companyId: input.companyId,
      recipientId:
        input.recipientId,
      status: input.status,
      limit: input.limit,
      offset: input.offset,
    })

  if (error) {
    return {
      data: [],
      error: {
        message: error.message,
      },
    }
  }

  return {
    data: presentNotifications(data),
    error: null,
  }
}
