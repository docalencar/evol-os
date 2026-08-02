import type {
  NotificationMetadata,
  NotificationPriority,
  NotificationType,
} from "../types/notification"

export const NOTIFICATION_PRODUCER_KEYS = [
  "people.activity",
  "organization.activity",
] as const

export type NotificationProducerKey =
  (typeof NOTIFICATION_PRODUCER_KEYS)[number]

export type NotificationRequirement = "mandatory" | "optional"
export type NotificationClassification = "company" | "restricted"

export type NotificationEvent = Readonly<{
  eventKey: string
  companyId: string
  producerKey: NotificationProducerKey
  eventType: string
  sourceType: "activity"
  sourceId: string
  actorId: string | null
  classification: NotificationClassification
  requirement: NotificationRequirement
  type: NotificationType
  priority: NotificationPriority
  title: string
  message: string
  entityType: string | null
  entityId: string | null
  subjectType: string | null
  subjectId: string | null
  metadata: NotificationMetadata
  occurredAt: string
}>

export type NotificationActivitySource = Readonly<{
  id: string
  companyId: string
  activityType: string
  module: string
  title: string
  description: string | null
  actorId: string | null
  entityType: string | null
  entityId: string | null
  subjectType: string | null
  subjectId: string | null
  visibility: NotificationClassification
  metadata: NotificationMetadata
  occurredAt: string
}>
