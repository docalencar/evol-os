import type {
  NotificationActivitySource,
  NotificationEvent,
  NotificationProducerKey,
} from "./notification-event"

export interface NotificationProducer {
  readonly key: NotificationProducerKey

  supports(source: NotificationActivitySource): boolean

  produce(source: NotificationActivitySource): NotificationEvent
}

function createActivityNotificationEvent(
  producerKey: NotificationProducerKey,
  source: NotificationActivitySource
): NotificationEvent {
  return Object.freeze({
    eventKey: `${producerKey}:${source.id}`,
    companyId: source.companyId,
    producerKey,
    eventType: source.activityType,
    sourceType: "activity",
    sourceId: source.id,
    actorId: source.actorId,
    classification: source.visibility,
    requirement: "optional",
    type: "information",
    priority: "normal",
    title: source.title,
    message: source.description ?? source.title,
    entityType: source.entityType,
    entityId: source.entityId,
    subjectType: source.subjectType,
    subjectId: source.subjectId,
    metadata: source.metadata,
    occurredAt: source.occurredAt,
  })
}

const PEOPLE_ACTIVITY_TYPES = new Set([
  "employee.created",
  "employee.updated",
  "employee.archived",
])

const ORGANIZATION_ACTIVITY_TYPES = new Set([
  "team.created",
  "team.updated",
  "team.archived",
  "department.created",
  "department.updated",
  "department.archived",
])

export const peopleActivityNotificationProducer: NotificationProducer = {
  key: "people.activity",
  supports(source) {
    return source.module === "people" &&
      PEOPLE_ACTIVITY_TYPES.has(source.activityType)
  },
  produce(source) {
    return createActivityNotificationEvent(this.key, source)
  },
}

export const organizationActivityNotificationProducer: NotificationProducer = {
  key: "organization.activity",
  supports(source) {
    return source.module === "organization" &&
      ORGANIZATION_ACTIVITY_TYPES.has(source.activityType)
  },
  produce(source) {
    return createActivityNotificationEvent(this.key, source)
  },
}
