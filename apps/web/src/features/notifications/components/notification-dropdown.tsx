import { Bell } from "lucide-react"

import type {
  NotificationViewModel,
} from "../view-models/notification-view-model"
import {
  NotificationBadge,
} from "./notification-badge"
import {
  NotificationEmptyState,
} from "./notification-empty-state"
import {
  NotificationItem,
} from "./notification-item"

type NotificationDropdownProps = {
  notifications: NotificationViewModel[]
  unreadCount: number
  notificationsHref?: string
  getNotificationHref?: (
    notification: NotificationViewModel
  ) => string | undefined
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  notificationsHref = "/app/notifications",
  getNotificationHref,
}: NotificationDropdownProps) {
  return (
    <details className="group relative">
      <summary
        aria-label="Abrir notificações"
        className={[
          "relative flex size-10 cursor-pointer list-none",
          "items-center justify-center rounded-lg border bg-background",
          "text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-foreground",
          "[&::-webkit-details-marker]:hidden",
        ].join(" ")}
      >
        <Bell
          aria-hidden="true"
          className="size-5"
        />

        <NotificationBadge
          count={unreadCount}
          className="absolute -right-1.5 -top-1.5"
        />
      </summary>

      <div
        className={[
          "absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))]",
          "overflow-hidden rounded-xl border bg-background shadow-lg",
        ].join(" ")}
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Notificações
            </h2>

            <p className="text-xs text-muted-foreground">
              {unreadCount === 0
                ? "Tudo em dia"
                : `${unreadCount} não ${
                    unreadCount === 1
                      ? "lida"
                      : "lidas"
                  }`}
            </p>
          </div>

          <a
            className="text-xs font-medium text-primary hover:underline"
            href={notificationsHref}
          >
            Ver todas
          </a>
        </div>

        <div className="max-h-[28rem] overflow-y-auto">
          {notifications.length === 0 ? (
            <NotificationEmptyState />
          ) : (
            notifications.map(
              (notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  href={getNotificationHref?.(
                    notification
                  )}
                />
              )
            )
          )}
        </div>
      </div>
    </details>
  )
}
