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

const archiveNotificationSchema =
  z.object({
    companyId: z.string().uuid(),
    recipientId: z.string().uuid(),
    notificationId: z.string().uuid(),
  })

export type ArchiveNotificationActionInput =
  z.infer<
    typeof archiveNotificationSchema
  >

export async function archiveNotificationAction(
  input: ArchiveNotificationActionInput
): Promise<NotificationActionResult> {
  const parsed =
    archiveNotificationSchema.safeParse(
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
  } = await repository.archive(
    parsed.data
  )

  if (error) {
    return {
      success: false,
      message:
        "Não foi possível arquivar a notificação.",
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
      "Notificação arquivada com sucesso.",
  }
}
