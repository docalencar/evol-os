import type {
  NotificationPriority,
  NotificationStatus,
  NotificationType,
} from "../types/notification"

export type NotificationViewModel = {
  id: string
  title: string
  message: string
  type: NotificationType
  priority: NotificationPriority
  status: NotificationStatus
  isUnread: boolean
  entityType: string | null
  entityId: string | null
  occurredAt: string
  occurredAtLabel: string
  readAt: string | null
}
