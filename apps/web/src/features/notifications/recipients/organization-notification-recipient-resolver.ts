import "server-only"

import {
  createNotificationRecipientDirectory,
} from "../directory"
import type {
  NotificationRecipient,
  NotificationRecipientContext,
  NotificationRecipientResolver,
} from "./notification-recipient-resolver"

const TEAM_ACTIVITY_TYPES =
  new Set([
    "team.created",
    "team.updated",
    "team.archived",
  ])

const DEPARTMENT_ACTIVITY_TYPES =
  new Set([
    "department.created",
    "department.updated",
    "department.archived",
  ])

function isTeamActivity(
  context: NotificationRecipientContext
): boolean {
  return (
    TEAM_ACTIVITY_TYPES.has(
      context.activityType
    ) &&
    context.entityType === "team" &&
    Boolean(context.entityId)
  )
}

function isDepartmentActivity(
  context: NotificationRecipientContext
): boolean {
  return (
    DEPARTMENT_ACTIVITY_TYPES.has(
      context.activityType
    ) &&
    context.entityType === "department" &&
    Boolean(context.entityId)
  )
}

function createRecipient(
  recipientId: string | null
): NotificationRecipient[] {
  if (!recipientId) {
    return []
  }

  return [
    {
      recipientId,
    },
  ]
}

export const organizationNotificationRecipientResolver:
  NotificationRecipientResolver = {
    supports(
      context: NotificationRecipientContext
    ) {
      return (
        isTeamActivity(context) ||
        isDepartmentActivity(context)
      )
    },

    async resolve(
      context: NotificationRecipientContext
    ): Promise<NotificationRecipient[]> {
      if (!context.entityId) {
        return []
      }

      const directory =
        await createNotificationRecipientDirectory()

      if (isTeamActivity(context)) {
        const leaderUserId =
          await directory.findTeamLeaderUserId(
            context.companyId,
            context.entityId
          )

        return createRecipient(
          leaderUserId
        )
      }

      if (isDepartmentActivity(context)) {
        const leaderUserId =
          await directory.findDepartmentLeaderUserId(
            context.companyId,
            context.entityId
          )

        return createRecipient(
          leaderUserId
        )
      }

      return []
    },
  }
