import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Info,
} from "lucide-react"

import type {
  NotificationType,
} from "../types/notification"
import type {
  NotificationViewModel,
} from "../view-models/notification-view-model"

type NotificationItemProps = {
  notification: NotificationViewModel
  href?: string
}

const notificationIcons = {
  information: Info,
  action_required: CircleAlert,
  reminder: Clock3,
  warning: AlertTriangle,
  success: CheckCircle2,
} satisfies Record<
  NotificationType,
  typeof Bell
>

function NotificationContent({
  notification,
}: {
  notification: NotificationViewModel
}) {
  const Icon =
    notificationIcons[notification.type]

  return (
    <>
      <div
        className={[
          "mt-0.5 flex size-9 shrink-0 items-center justify-center",
          "rounded-full border bg-background",
        ].join(" ")}
      >
        <Icon
          aria-hidden="true"
          className="size-4 text-muted-foreground"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground">
            {notification.title}
          </p>

          {notification.isUnread ? (
            <span
              aria-label="Não lida"
              className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
            />
          ) : null}
        </div>

        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {notification.message}
        </p>

        <p className="mt-2 text-xs text-muted-foreground">
          {notification.occurredAtLabel}
        </p>
      </div>
    </>
  )
}

export function NotificationItem({
  notification,
  href,
}: NotificationItemProps) {
  const className = [
    "flex w-full gap-3 border-b px-4 py-4 text-left",
    "transition-colors last:border-b-0 hover:bg-muted/50",
    notification.isUnread
      ? "bg-primary/[0.03]"
      : "bg-background",
  ].join(" ")

  if (href) {
    return (
      <a
        className={className}
        href={href}
      >
        <NotificationContent
          notification={notification}
        />
      </a>
    )
  }

  return (
    <div className={className}>
      <NotificationContent
        notification={notification}
      />
    </div>
  )
}
