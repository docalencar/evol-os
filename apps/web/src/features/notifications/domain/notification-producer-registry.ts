import {
  organizationActivityNotificationProducer,
  peopleActivityNotificationProducer,
  type NotificationProducer,
} from "./notification-producer"
import type {
  NotificationActivitySource,
  NotificationEvent,
} from "./notification-event"

export class NotificationProducerRegistry {
  constructor(
    private readonly producers: readonly NotificationProducer[]
  ) {}

  produce(source: NotificationActivitySource): NotificationEvent | null {
    const producer = this.producers.find((candidate) =>
      candidate.supports(source)
    )

    return producer?.produce(source) ?? null
  }
}

export function createDefaultNotificationProducerRegistry(): NotificationProducerRegistry {
  return new NotificationProducerRegistry([
    peopleActivityNotificationProducer,
    organizationActivityNotificationProducer,
  ])
}
