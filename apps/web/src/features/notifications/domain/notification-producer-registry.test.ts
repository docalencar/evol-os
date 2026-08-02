import assert from "node:assert/strict"
import test from "node:test"

import type { NotificationActivitySource } from "./notification-event"
import { createDefaultNotificationProducerRegistry } from "./notification-producer-registry"

function activity(
  overrides: Partial<NotificationActivitySource> = {}
): NotificationActivitySource {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    companyId: "10000000-0000-4000-8000-000000000002",
    activityType: "employee.updated",
    module: "people",
    title: "Colaborador atualizado",
    description: "Dados atualizados.",
    actorId: "10000000-0000-4000-8000-000000000003",
    entityType: "employee",
    entityId: "10000000-0000-4000-8000-000000000004",
    subjectType: "employee",
    subjectId: "10000000-0000-4000-8000-000000000004",
    visibility: "company",
    metadata: {},
    occurredAt: "2026-08-02T12:00:00.000Z",
    ...overrides,
  }
}

test("People Producer cria Notification Event catalogado e opcional", () => {
  const event = createDefaultNotificationProducerRegistry().produce(activity())

  assert.equal(event?.producerKey, "people.activity")
  assert.equal(
    event?.eventKey,
    "people.activity:10000000-0000-4000-8000-000000000001"
  )
  assert.equal(event?.requirement, "optional")
  assert.equal(event?.sourceType, "activity")
})

test("Organization Producer cobre somente eventos do catálogo", () => {
  const event = createDefaultNotificationProducerRegistry().produce(activity({
    activityType: "team.archived",
    module: "organization",
    entityType: "team",
  }))

  assert.equal(event?.producerKey, "organization.activity")
})

test("registry ignora evento funcional não aprovado", () => {
  const event = createDefaultNotificationProducerRegistry().produce(activity({
    activityType: "position.created",
    module: "organization",
  }))

  assert.equal(event, null)
})
