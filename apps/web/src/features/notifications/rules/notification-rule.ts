import type {
  NotificationMetadata,
  NotificationPriority,
  NotificationType,
} from "../types/notification"

export type NotificationRuleContext = {
  companyId: string
  recipientId: string
  activityType: string
  activityEventId?: string | null
  entityType?: string | null
  entityId?: string | null
  title: string
  message: string
  metadata?: NotificationMetadata
}

export type NotificationRuleResult = {
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  metadata: NotificationMetadata
}

export type NotificationRule = {
  supports(
    context: NotificationRuleContext
  ): boolean

  evaluate(
    context: NotificationRuleContext
  ): NotificationRuleResult | null
}
