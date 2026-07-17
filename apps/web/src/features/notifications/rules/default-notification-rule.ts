import type {
  NotificationRule,
  NotificationRuleContext,
  NotificationRuleResult,
} from "./notification-rule"

export const defaultNotificationRule:
  NotificationRule = {
    supports() {
      return true
    },

    evaluate(
      context: NotificationRuleContext
    ): NotificationRuleResult {
      return {
        type: "information",
        priority: "normal",
        title: context.title,
        message: context.message,
        metadata: {
          ...(context.metadata ?? {}),
          activityType:
            context.activityType,
        },
      }
    },
  }
