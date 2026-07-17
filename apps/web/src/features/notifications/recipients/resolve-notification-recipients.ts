import {
  defaultNotificationRecipientResolver,
} from "./default-notification-recipient-resolver"
import type {
  NotificationRecipient,
  NotificationRecipientContext,
  NotificationRecipientResolver,
} from "./notification-recipient-resolver"

export type ResolveNotificationRecipientsOptions = {
  resolvers?: NotificationRecipientResolver[]
}

export async function resolveNotificationRecipients(
  context: NotificationRecipientContext,
  options: ResolveNotificationRecipientsOptions = {}
): Promise<NotificationRecipient[]> {
  const resolvers =
    options.resolvers ?? [
      defaultNotificationRecipientResolver,
    ]

  const supportedResolvers =
    resolvers.filter((resolver) =>
      resolver.supports(context)
    )

  const resolvedRecipients =
    await Promise.all(
      supportedResolvers.map((resolver) =>
        resolver.resolve(context)
      )
    )

  const recipientIds =
    resolvedRecipients
      .flat()
      .map(
        (recipient) =>
          recipient.recipientId
      )

  return Array.from(
    new Set(recipientIds)
  ).map((recipientId) => ({
    recipientId,
  }))
}
