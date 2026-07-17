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
import type {
  NotificationActionResult,
} from "./mark-notification-as-read-action"

const deleteNotificationSchema =
  z.object({
    companyId: z.string().uuid(),
    recipientId: z.string().uuid(),
    notificationId: z.string().uuid(),
  })

export type DeleteNotificationActionInput =
  z.infer<
    typeof deleteNotificationSchema
  >

export async function deleteNotificationAction(
  input: DeleteNotificationActionInput
): Promise<NotificationActionResult> {
  const parsed =
    deleteNotificationSchema.safeParse(
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
  } = await repository.delete(
    parsed.data
  )

  if (error) {
    return {
      success: false,
      message:
        "Não foi possível excluir a notificação.",
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
      "Notificação excluída com sucesso.",
  }
}
