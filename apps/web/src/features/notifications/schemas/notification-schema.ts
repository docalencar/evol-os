import { z } from "zod"

import { NOTIFICATION_STATUSES } from "../constants/notification-constants"

export const updateNotificationStatusSchema = z.object({
  notificationId: z.string().uuid(),
  status: z.enum(NOTIFICATION_STATUSES),
})

export type UpdateNotificationStatusInput =
  z.infer<typeof updateNotificationStatusSchema>
