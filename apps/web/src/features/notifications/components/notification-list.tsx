import type {
  NotificationViewModel,
} from "../view-models/notification-view-model"
import {
  NotificationEmptyState,
} from "./notification-empty-state"
import {
  NotificationItem,
} from "./notification-item"

type NotificationListProps = {
  notifications: NotificationViewModel[]
  getNotificationHref?: (
    notification: NotificationViewModel
  ) => string | undefined
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

export function NotificationList({
  notifications,
  getNotificationHref,
  emptyTitle,
  emptyDescription,
  className = "",
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className={className}>
        <NotificationEmptyState
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    )
  }

  return (
    <div
      className={[
        "overflow-hidden rounded-xl border bg-background",
        className,
      ].join(" ")}
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          href={getNotificationHref?.(
            notification
          )}
        />
      ))}
    </div>
  )
}
