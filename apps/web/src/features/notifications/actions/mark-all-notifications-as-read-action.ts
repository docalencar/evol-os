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

const markAllNotificationsAsReadSchema =
  z.object({
    companyId: z.string().uuid(),
    recipientId: z.string().uuid(),
  })

export type MarkAllNotificationsAsReadActionInput =
  z.infer<
    typeof markAllNotificationsAsReadSchema
  >

export async function markAllNotificationsAsReadAction(
  input: MarkAllNotificationsAsReadActionInput
): Promise<NotificationActionResult> {
  const parsed =
    markAllNotificationsAsReadSchema.safeParse(
      input
    )

  if (!parsed.success) {
    return {
      success: false,
      message:
        "Os dados das notificações são inválidos.",
    }
  }

  const repository =
    await createNotificationCommandRepository()

  const {
    data,
    error,
  } = await repository.markAllAsRead(
    parsed.data
  )

  if (error) {
    return {
      success: false,
      message:
        "Não foi possível marcar as notificações como lidas.",
    }
  }

  const updatedCount =
    data?.length ?? 0

  revalidatePath("/app")
  revalidatePath("/app/notifications")

  return {
    success: true,
    message:
      updatedCount === 0
        ? "Não havia notificações pendentes."
        : `${updatedCount} ${
            updatedCount === 1
              ? "notificação marcada"
              : "notificações marcadas"
          } como ${
            updatedCount === 1
              ? "lida"
              : "lidas"
          }.`,
  }
}
