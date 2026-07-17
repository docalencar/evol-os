import "server-only"

import {
  createNotificationRecipientDirectory,
} from "../directory"
import type {
  NotificationRecipient,
  NotificationRecipientContext,
  NotificationRecipientResolver,
} from "./notification-recipient-resolver"

const SUPPORTED_ACTIVITY_TYPES =
  new Set([
    "employee.created",
    "employee.updated",
    "employee.archived",
  ])

function resolveEmployeeId(
  context: NotificationRecipientContext
): string | null {
  if (
    context.subjectType === "employee" &&
    context.subjectId
  ) {
    return context.subjectId
  }

  if (
    context.entityType === "employee" &&
    context.entityId
  ) {
    return context.entityId
  }

  return null
}

function shouldNotifyEmployee(
  activityType: string
): boolean {
  return activityType === "employee.updated"
}

function shouldNotifyManager(
  activityType: string
): boolean {
  return (
    activityType === "employee.created" ||
    activityType === "employee.updated" ||
    activityType === "employee.archived"
  )
}

function createRecipients(
  recipientIds: Array<string | null>
): NotificationRecipient[] {
  return Array.from(
    new Set(
      recipientIds.filter(
        (recipientId): recipientId is string =>
          Boolean(recipientId)
      )
    )
  ).map((recipientId) => ({
    recipientId,
  }))
}

export const employeeNotificationRecipientResolver:
  NotificationRecipientResolver = {
    supports(
      context: NotificationRecipientContext
    ) {
      return (
        SUPPORTED_ACTIVITY_TYPES.has(
          context.activityType
        ) &&
        Boolean(
          resolveEmployeeId(context)
        )
      )
    },

    async resolve(
      context: NotificationRecipientContext
    ): Promise<NotificationRecipient[]> {
      const employeeId =
        resolveEmployeeId(context)

      if (!employeeId) {
        return []
      }

      const directory =
        await createNotificationRecipientDirectory()

      const employeeUserId =
        shouldNotifyEmployee(
          context.activityType
        )
          ? await directory.findUserIdByEmployeeId(
              context.companyId,
              employeeId
            )
          : null

      const managerUserId =
        shouldNotifyManager(
          context.activityType
        )
          ? await directory.findManagerUserId(
              context.companyId,
              employeeId
            )
          : null

      return createRecipients([
        employeeUserId,
        managerUserId,
      ])
    },
  }
