import {
  createNotificationRepository,
} from "../repositories/notification-repository"

export type GetUnreadNotificationCountInput = {
  companyId: string
  recipientId: string
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
  if (
    !input.companyId ||
    !input.recipientId
  ) {
    return {
      count: 0,
      error: {
        message:
          "Empresa e destinatário são obrigatórios.",
      },
    }
  }

  const repository =
    await createNotificationRepository()

  const { count, error } =
    await repository.countUnread(
      input.companyId,
      input.recipientId
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
