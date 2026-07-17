import type {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
} from "../constants/notification-constants"

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[number]

export type NotificationPriority =
  (typeof NOTIFICATION_PRIORITIES)[number]

export type NotificationStatus =
  (typeof NOTIFICATION_STATUSES)[number]

export type NotificationChannel =
  (typeof NOTIFICATION_CHANNELS)[number]

export type NotificationMetadataValue =
  | string
  | number
  | boolean
  | null
  | NotificationMetadataValue[]
  | {
      [key: string]: NotificationMetadataValue
    }

export type NotificationMetadata = {
  [key: string]: NotificationMetadataValue
}

export type Notification = {
  id: string
  companyId: string
  recipientId: string
  activityEventId: string | null
  type: NotificationType
  priority: NotificationPriority
  status: NotificationStatus
  title: string
  message: string
  entityType: string | null
  entityId: string | null
  metadata: NotificationMetadata
  readAt: Date | null
  archivedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type NotificationPreference = {
  id: string
  companyId: string
  userId: string
  inAppEnabled: boolean
  emailEnabled: boolean
  pushEnabled: boolean
  teamsEnabled: boolean
  slackEnabled: boolean
  createdAt: Date
  updatedAt: Date
}

export type NotificationTemplate = {
  id: string
  companyId: string | null
  activityType: string
  titleTemplate: string
  messageTemplate: string
  type: NotificationType
  priority: NotificationPriority
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
