import "server-only"

import { ProcessActivityNotificationService } from "./application/process-activity-notification"
import { TrustedNotificationPersistenceService } from "./application/trusted-notification-persistence"
import { createNotificationRecipientDirectory } from "./directory"
import { NotificationDeliveryPolicy } from "./domain/delivery-policy"
import { createDefaultNotificationProducerRegistry } from "./domain/notification-producer-registry"
import { createNotificationPreferenceRepository } from "./repositories/notification-preference-repository"
import { createTrustedNotificationRepository } from "./repositories/trusted-notification-repository"

export async function createActivityNotificationProcessor():
Promise<ProcessActivityNotificationService> {
  return new ProcessActivityNotificationService(
    createDefaultNotificationProducerRegistry(),
    await createNotificationRecipientDirectory(),
    await createNotificationPreferenceRepository(),
    new NotificationDeliveryPolicy(),
    new TrustedNotificationPersistenceService(
      createTrustedNotificationRepository()
    )
  )
}
