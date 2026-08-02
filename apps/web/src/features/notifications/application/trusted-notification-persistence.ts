import type { NotificationDeliveryDecision } from "../domain/delivery-policy"
import type { NotificationEvent } from "../domain/notification-event"

export type PersistedNotificationEvent = Readonly<{
  eventId: string
  deliveryIds: readonly string[]
}>

export interface TrustedNotificationPersistenceGateway {
  persist(
    event: NotificationEvent,
    deliveries: readonly NotificationDeliveryDecision[]
  ): Promise<PersistedNotificationEvent>
}

export class TrustedNotificationPersistenceService {
  constructor(
    private readonly gateway: TrustedNotificationPersistenceGateway
  ) {}

  async persist(
    event: NotificationEvent,
    deliveries: readonly NotificationDeliveryDecision[]
  ): Promise<PersistedNotificationEvent | null> {
    if (deliveries.length === 0) {
      return null
    }

    const uniqueDeliveryKeys = new Set(
      deliveries.map(({ deliveryKey }) => deliveryKey)
    )
    if (uniqueDeliveryKeys.size !== deliveries.length) {
      throw new Error("As deliveries de Notifications devem ser idempotentes.")
    }

    if (deliveries.some(({ recipientId }) => recipientId === event.actorId)) {
      throw new Error("O ator não pode receber o próprio evento catalogado.")
    }

    return this.gateway.persist(event, deliveries)
  }
}
