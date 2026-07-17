"use server"

import {
  revalidatePath,
} from "next/cache"
import {
  z,
} from "zod"

import {
  createNotificationCommandRepository,
} from "../repositories/notification-command-repository"

const markNotificationAsReadSchema =
  z.object({
    companyId: z.string().uuid(),
    recipientId: z.string().uuid(),
    notificationId: z.string().uuid(),
  })

export type MarkNotificationAsReadActionInput =
  z.infer<
    typeof markNotificationAsReadSchema
  >

export type NotificationActionResult = {
  success: boolean
  message: string
}

export async function markNotificationAsReadAction(
  input: MarkNotificationAsReadActionInput
): Promise<NotificationActionResult> {
  const parsed =
    markNotificationAsReadSchema.safeParse(
      input
    )

  if (!parsed.success) {
    return {
      success: false,
      message:
        "Os dados da notificação são inválidos.",
    }
  }

  const repository =
    await createNotificationCommandRepository()

  const {
    data,
    error,
  } = await repository.markAsRead(
    parsed.data
  )

  if (error) {
    return {
      success: false,
      message:
        "Não foi possível marcar a notificação como lida.",
    }
  }

  if (!data) {
    return {
      success: false,
      message:
        "A notificação não foi encontrada.",
    }
  }

  revalidatePath("/app")
  revalidatePath("/app/notifications")

  return {
    success: true,
    message:
      "Notificação marcada como lida.",
  }
}
