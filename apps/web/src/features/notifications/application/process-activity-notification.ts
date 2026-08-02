import type { NotificationRecipientDirectory } from "../directory"
import type { NotificationActivitySource } from "../domain/notification-event"
import type { NotificationProducerRegistry } from "../domain/notification-producer-registry"
import type {
  NotificationDeliveryPolicy,
  NotificationPreferenceSnapshot,
} from "../domain/delivery-policy"
import { resolveNotificationEventRecipients } from "./resolve-notification-event-recipients"
import type { TrustedNotificationPersistenceService } from "./trusted-notification-persistence"

export interface NotificationPreferenceReader {
  findByUsers(
    companyId: string,
    userIds: readonly string[]
  ): Promise<ReadonlyMap<string, NotificationPreferenceSnapshot>>
}

export class ProcessActivityNotificationService {
  constructor(
    private readonly producerRegistry: NotificationProducerRegistry,
    private readonly directory: NotificationRecipientDirectory,
    private readonly preferenceReader: NotificationPreferenceReader,
    private readonly deliveryPolicy: NotificationDeliveryPolicy,
    private readonly persistence: TrustedNotificationPersistenceService
  ) {}

  async execute(source: NotificationActivitySource): Promise<void> {
    const event = this.producerRegistry.produce(source)
    if (!event) {
      return
    }

    if (event.classification === "restricted") {
      return
    }

    const recipients = await resolveNotificationEventRecipients(
      event,
      this.directory
    )
    const preferences = await this.preferenceReader.findByUsers(
      event.companyId,
      recipients.map(({ recipientId }) => recipientId)
    )
    const deliveries = this.deliveryPolicy.decide(
      event,
      recipients,
      preferences
    )

    await this.persistence.persist(event, deliveries)
  }
}
