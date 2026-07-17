import type {
  NotificationMetadata,
} from "../types/notification"

export type NotificationRecipientContext = {
  companyId: string
  activityType: string
  activityEventId: string
  module: string
  actorId?: string | null
  entityType?: string | null
  entityId?: string | null
  subjectType?: string | null
  subjectId?: string | null
  metadata: NotificationMetadata
}

export type NotificationRecipient = {
  recipientId: string
}

export type NotificationRecipientResolver = {
  supports(
    context: NotificationRecipientContext
  ): boolean

  resolve(
    context: NotificationRecipientContext
  ):
    | Promise<NotificationRecipient[]>
    | NotificationRecipient[]
}
