import "server-only"

import type {
  TrustedNotificationPersistenceGateway,
} from "../application/trusted-notification-persistence"
import type { NotificationDeliveryDecision } from "../domain/delivery-policy"
import type { NotificationEvent } from "../domain/notification-event"
import { createNotificationTrustedDatabase } from "../server/notification-trusted-database"

type PersistNotificationResult = {
  event_id: string
  delivery_ids: string[]
}

export function createTrustedNotificationRepository():
TrustedNotificationPersistenceGateway {
  const supabase = createNotificationTrustedDatabase()

  return {
    async persist(
      event: NotificationEvent,
      deliveries: readonly NotificationDeliveryDecision[]
    ) {
      const { data, error } = await supabase.rpc(
        "persist_notification_event",
        {
          p_event: {
            event_key: event.eventKey,
            company_id: event.companyId,
            producer_key: event.producerKey,
            event_type: event.eventType,
            source_type: event.sourceType,
            source_id: event.sourceId,
            actor_id: event.actorId,
            classification: event.classification,
            requirement: event.requirement,
            type: event.type,
            priority: event.priority,
            title: event.title,
            message: event.message,
            entity_type: event.entityType,
            entity_id: event.entityId,
            subject_type: event.subjectType,
            subject_id: event.subjectId,
            metadata: event.metadata,
            occurred_at: event.occurredAt,
          },
          p_deliveries: deliveries.map((delivery) => ({
            delivery_key: delivery.deliveryKey,
            recipient_id: delivery.recipientId,
            channel: delivery.channel,
          })),
        }
      )

      if (error) {
        throw new Error(
          `Não foi possível persistir o Notification Event: ${error.message}`
        )
      }

      const result = data as PersistNotificationResult
      return {
        eventId: result.event_id,
        deliveryIds: result.delivery_ids,
      }
    },
  }
}
