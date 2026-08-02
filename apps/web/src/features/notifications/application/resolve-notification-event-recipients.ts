import type { NotificationRecipientDirectory } from "../directory"
import type { NotificationEvent } from "../domain/notification-event"
import type { NotificationRecipient } from "../recipients/notification-recipient-resolver"

function resolveEmployeeId(event: NotificationEvent): string | null {
  if (event.subjectType === "employee" && event.subjectId) {
    return event.subjectId
  }

  if (event.entityType === "employee" && event.entityId) {
    return event.entityId
  }

  return null
}

function uniqueRecipients(
  recipientIds: readonly (string | null)[],
  actorId: string | null
): NotificationRecipient[] {
  return Array.from(new Set(
    recipientIds.filter(
      (recipientId): recipientId is string =>
        Boolean(recipientId) && recipientId !== actorId
    )
  )).map((recipientId) => ({ recipientId }))
}

export async function resolveNotificationEventRecipients(
  event: NotificationEvent,
  directory: NotificationRecipientDirectory
): Promise<NotificationRecipient[]> {
  if (event.producerKey === "people.activity") {
    const employeeId = resolveEmployeeId(event)
    if (!employeeId) {
      return []
    }

    const managerUserId = await directory.findManagerUserId(
      event.companyId,
      employeeId
    )
    const employeeUserId = event.eventType === "employee.updated"
      ? await directory.findUserIdByEmployeeId(event.companyId, employeeId)
      : null

    return uniqueRecipients(
      [employeeUserId, managerUserId],
      event.actorId
    )
  }

  if (!event.entityId) {
    return []
  }

  const leaderUserId = event.entityType === "team"
    ? await directory.findTeamLeaderUserId(event.companyId, event.entityId)
    : event.entityType === "department"
      ? await directory.findDepartmentLeaderUserId(event.companyId, event.entityId)
      : null

  return uniqueRecipients([leaderUserId], event.actorId)
}
