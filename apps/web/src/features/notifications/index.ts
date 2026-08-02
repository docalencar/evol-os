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

export { updateNotificationStatusSchema } from "./schemas/notification-schema"

export type { UpdateNotificationStatusInput } from "./schemas/notification-schema"

export {
  createNotificationRepository,
} from "./repositories/notification-repository"

export type {
  FindNotificationsByRecipientInput,
} from "./repositories/notification-repository"

export {
  presentNotification,
  presentNotifications,
} from "./presenters/notification-presenter"

export type {
  NotificationViewModel,
} from "./view-models/notification-view-model"

export {
  getNotifications,
} from "./queries/get-notifications"

export type {
  GetNotificationsInput,
  GetNotificationsResult,
} from "./queries/get-notifications"

export {
  getUnreadNotificationCount,
} from "./queries/get-unread-notification-count"

export type {
  GetUnreadNotificationCountInput,
  GetUnreadNotificationCountResult,
} from "./queries/get-unread-notification-count"

export {
  NotificationBadge,
  NotificationDropdown,
  NotificationEmptyState,
  NotificationItem,
  NotificationList,
} from "./components"

export {
  archiveNotificationAction,
  deleteNotificationAction,
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "./actions"

export type {
  ArchiveNotificationActionInput,
  DeleteNotificationActionInput,
  MarkAllNotificationsAsReadActionInput,
  MarkNotificationAsReadActionInput,
  NotificationActionResult,
} from "./actions"

export type {
  NotificationRecipient,
} from "./recipients"

export {
  createNotificationRecipientDirectory,
  createNotificationRecipientDirectoryRepository,
  createNotificationRecipientDirectoryService,
} from "./directory"

export type {
  NotificationRecipientDirectory,
} from "./directory"

export {
  NotificationDeliveryPolicy,
} from "./domain/delivery-policy"
export {
  createDefaultNotificationProducerRegistry,
  NotificationProducerRegistry,
} from "./domain/notification-producer-registry"
export type {
  NotificationEvent,
  NotificationProducerKey,
} from "./domain/notification-event"
