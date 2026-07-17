import {
  createNotificationPayload,
} from "../factories/notification-factory"
import {
  createNotification,
  type CreateNotificationResult,
} from "./create-notification"
import type {
  NotificationRule,
  NotificationRuleContext,
} from "../rules/notification-rule"

export async function createNotificationFromRule(
  rule: NotificationRule,
  context: NotificationRuleContext
): Promise<CreateNotificationResult> {
  if (!rule.supports(context)) {
    return {
      data: null,
      error: null,
    }
  }

  const result = rule.evaluate(context)

  if (!result) {
    return {
      data: null,
      error: null,
    }
  }

  return createNotification(
    createNotificationPayload({
      companyId: context.companyId,
      recipientId:
        context.recipientId,
      activityEventId:
        context.activityEventId,
      entityType:
        context.entityType,
      entityId:
        context.entityId,
      type: result.type,
      priority: result.priority,
      title: result.title,
      message: result.message,
      metadata: result.metadata,
    })
  )
}
