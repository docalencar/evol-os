export {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUSES,
  NOTIFICATION_TYPES,
} from "./constants/notification-constants"

export type {
  Notification,
  NotificationChannel,
  NotificationMetadata,
  NotificationMetadataValue,
  NotificationPreference,
  NotificationPriority,
  NotificationStatus,
  NotificationTemplate,
  NotificationType,
} from "./types/notification"

export {
  createNotificationSchema,
  updateNotificationStatusSchema,
} from "./schemas/notification-schema"

export type {
  CreateNotificationInput,
  UpdateNotificationStatusInput,
  ValidatedCreateNotificationInput,
} from "./schemas/notification-schema"
