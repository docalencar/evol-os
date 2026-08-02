import {
  createNotificationRepository,
} from "../repositories/notification-repository"
import { loadNotificationActor } from "../application/load-notification-actor"

export type GetUnreadNotificationCountInput = {
  companyId?: string
  recipientId?: string
}

export type GetUnreadNotificationCountResult = {
  count: number
  error: {
    message: string
  } | null
}

export async function getUnreadNotificationCount(
  input: GetUnreadNotificationCountInput
): Promise<GetUnreadNotificationCountResult> {
  void input

  const repository =
    await createNotificationRepository()
  const actor = await loadNotificationActor()

  const { count, error } =
    await repository.countUnread(
      actor.companyId,
      actor.userId
    )

  if (error) {
    return {
      count: 0,
      error: {
        message: error.message,
      },
    }
  }

  return {
    count,
    error: null,
  }
}
