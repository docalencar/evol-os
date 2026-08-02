"use server"

import {
  z,
} from "zod"

import type {
  NotificationActionResult,
} from "./mark-notification-as-read-action"

const deleteNotificationSchema =
  z.object({
    companyId: z.string().uuid().optional(),
    recipientId: z.string().uuid().optional(),
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

  return {
    success: false,
    message:
      "Notificações podem ser arquivadas, mas não excluídas.",
  }
}
