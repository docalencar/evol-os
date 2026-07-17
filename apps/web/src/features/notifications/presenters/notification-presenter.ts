import type {
  Notification,
} from "../types/notification"
import type {
  NotificationViewModel,
} from "../view-models/notification-view-model"

const relativeTimeFormatter =
  new Intl.RelativeTimeFormat(
    "pt-BR",
    {
      numeric: "auto",
    }
  )

function presentRelativeDate(
  date: Date,
  now = new Date()
) {
  const differenceInSeconds = Math.round(
    (
      date.getTime() -
      now.getTime()
    ) / 1000
  )

  const absoluteDifference =
    Math.abs(differenceInSeconds)

  if (absoluteDifference < 60) {
    return relativeTimeFormatter.format(
      differenceInSeconds,
      "second"
    )
  }

  const differenceInMinutes =
    Math.round(
      differenceInSeconds / 60
    )

  if (
    Math.abs(differenceInMinutes) <
    60
  ) {
    return relativeTimeFormatter.format(
      differenceInMinutes,
      "minute"
    )
  }

  const differenceInHours =
    Math.round(
      differenceInMinutes / 60
    )

  if (
    Math.abs(differenceInHours) <
    24
  ) {
    return relativeTimeFormatter.format(
      differenceInHours,
      "hour"
    )
  }

  const differenceInDays =
    Math.round(
      differenceInHours / 24
    )

  if (
    Math.abs(differenceInDays) <
    30
  ) {
    return relativeTimeFormatter.format(
      differenceInDays,
      "day"
    )
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date)
}

export function presentNotification(
  notification: Notification,
  now = new Date()
): NotificationViewModel {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    priority: notification.priority,
    status: notification.status,
    isUnread:
      notification.status === "unread",
    entityType:
      notification.entityType,
    entityId:
      notification.entityId,
    occurredAt:
      notification.createdAt.toISOString(),
    occurredAtLabel:
      presentRelativeDate(
        notification.createdAt,
        now
      ),
    readAt:
      notification.readAt?.toISOString() ??
      null,
  }
}

export function presentNotifications(
  notifications: Notification[],
  now = new Date()
): NotificationViewModel[] {
  return notifications.map(
    (notification) =>
      presentNotification(
        notification,
        now
      )
  )
}
