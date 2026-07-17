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

export {
  createNotificationRepository,
} from "./repositories/notification-repository"

export {
  createNotificationPayload,
} from "./factories/notification-factory"

export type {
  NotificationFactoryInput,
} from "./factories/notification-factory"

export type {
  NotificationRule,
  NotificationRuleContext,
  NotificationRuleResult,
} from "./rules/notification-rule"

export {
  defaultNotificationRule,
} from "./rules/default-notification-rule"

export {
  createNotification,
} from "./services/create-notification"

export type {
  CreateNotificationResult,
} from "./services/create-notification"

export {
  createNotificationFromRule,
} from "./services/create-notification-from-rule"
