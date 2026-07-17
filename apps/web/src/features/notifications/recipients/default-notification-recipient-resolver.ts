import type {
  NotificationRecipient,
  NotificationRecipientContext,
  NotificationRecipientResolver,
} from "./notification-recipient-resolver"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    UUID_PATTERN.test(value)
  )
}

function getExplicitRecipientIds(
  context: NotificationRecipientContext
): string[] {
  const value =
    context.metadata
      .notificationRecipientIds

  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isUuid)
}

export const defaultNotificationRecipientResolver:
  NotificationRecipientResolver = {
    supports() {
      return true
    },

    resolve(
      context: NotificationRecipientContext
    ): NotificationRecipient[] {
      const recipientIds =
        getExplicitRecipientIds(context)

      return Array.from(
        new Set(recipientIds)
      ).map((recipientId) => ({
        recipientId,
      }))
    },
  }
