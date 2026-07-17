import "server-only"

import {
  createNotificationRecipientDirectoryRepository,
} from "./notification-recipient-directory-repository"
import {
  createNotificationRecipientDirectoryService,
} from "./notification-recipient-directory"
import type {
  NotificationRecipientDirectory,
} from "./notification-recipient-directory"

export async function createNotificationRecipientDirectory():
  Promise<NotificationRecipientDirectory> {
  const repository =
    await createNotificationRecipientDirectoryRepository()

  return createNotificationRecipientDirectoryService(
    repository
  )
}
