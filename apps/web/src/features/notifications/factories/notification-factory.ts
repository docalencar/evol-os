import type {
  CreateNotificationInput,
} from "../schemas/notification-schema"
import type {
  NotificationMetadata,
  NotificationPriority,
  NotificationType,
} from "../types/notification"

export type NotificationFactoryInput = {
  companyId: string
  recipientId: string
  title: string
  message: string
  activityEventId?: string | null
  type?: NotificationType
  priority?: NotificationPriority
  entityType?: string | null
  entityId?: string | null
  metadata?: NotificationMetadata
}

export function createNotificationPayload(
  input: NotificationFactoryInput
): CreateNotificationInput {
  return {
    companyId: input.companyId,
    recipientId: input.recipientId,
    activityEventId:
      input.activityEventId ?? null,
    type: input.type ?? "information",
    priority:
      input.priority ?? "normal",
    title: input.title,
    message: input.message,
    entityType:
      input.entityType ?? null,
    entityId:
      input.entityId ?? null,
    metadata: input.metadata ?? {},
  }
}
