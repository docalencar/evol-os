import type { NotificationEvent } from "./notification-event"
import type { NotificationRecipient } from "../recipients/notification-recipient-resolver"

export type NotificationPreferenceSnapshot = Readonly<{
  userId: string
  inAppEnabled: boolean
}>

export type NotificationDeliveryDecision = Readonly<{
  deliveryKey: string
  recipientId: string
  channel: "in_app"
  status: "pending"
}>

export class NotificationDeliveryPolicy {
  decide(
    event: NotificationEvent,
    recipients: readonly NotificationRecipient[],
    preferences: ReadonlyMap<string, NotificationPreferenceSnapshot>
  ): readonly NotificationDeliveryDecision[] {
    const recipientIds = Array.from(new Set(
      recipients
        .map(({ recipientId }) => recipientId)
        .filter((recipientId) => recipientId !== event.actorId)
    ))

    return Object.freeze(recipientIds.flatMap((recipientId) => {
      const preference = preferences.get(recipientId)
      const isEnabled = event.requirement === "mandatory" ||
        preference?.inAppEnabled !== false

      if (!isEnabled) {
        return []
      }

      return [Object.freeze({
        deliveryKey: `${event.eventKey}:${recipientId}:in_app`,
        recipientId,
        channel: "in_app" as const,
        status: "pending" as const,
      })]
    }))
  }
}
