import { z } from "zod"

import {
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
} from "../constants/notification-constants"

const optionalUuidSchema = z
  .string()
  .uuid()
  .nullable()
  .optional()

const optionalTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .nullable()
  .optional()

export const createNotificationSchema = z.object({
  companyId: z.string().uuid(),
  recipientId: z.string().uuid(),
  activityEventId: optionalUuidSchema,

  type: z
    .enum(NOTIFICATION_TYPES)
    .default("information"),

  priority: z
    .enum(NOTIFICATION_PRIORITIES)
    .default("normal"),

  title: z
    .string()
    .trim()
    .min(1)
    .max(200),

  message: z
    .string()
    .trim()
    .min(1)
    .max(2000),

  entityType: optionalTextSchema,
  entityId: optionalUuidSchema,

  metadata: z
    .record(z.string(), z.unknown())
    .default({}),
}).superRefine((input, context) => {
  const hasEntityType = Boolean(input.entityType)
  const hasEntityId = Boolean(input.entityId)

  if (hasEntityType !== hasEntityId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["entityId"],
      message:
        "Tipo e identificador da entidade devem ser informados juntos.",
    })
  }
})

export const updateNotificationStatusSchema = z.object({
  notificationId: z.string().uuid(),
  status: z.enum(NOTIFICATION_STATUSES),
})

export type CreateNotificationInput =
  z.input<typeof createNotificationSchema>

export type ValidatedCreateNotificationInput =
  z.output<typeof createNotificationSchema>

export type UpdateNotificationStatusInput =
  z.infer<typeof updateNotificationStatusSchema>
