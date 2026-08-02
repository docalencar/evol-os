import assert from "node:assert/strict"
import test from "node:test"

import { NotificationDeliveryPolicy } from "./delivery-policy"
import type { NotificationEvent } from "./notification-event"

const event: NotificationEvent = {
  eventKey: "people.activity:event-1",
  companyId: "company-1",
  producerKey: "people.activity",
  eventType: "employee.updated",
  sourceType: "activity",
  sourceId: "event-1",
  actorId: "actor-1",
  classification: "company",
  requirement: "optional",
  type: "information",
  priority: "normal",
  title: "Atualização",
  message: "Atualização",
  entityType: "employee",
  entityId: "employee-1",
  subjectType: "employee",
  subjectId: "employee-1",
  metadata: {},
  occurredAt: "2026-08-02T12:00:00.000Z",
}

test("Delivery Policy cria somente deliveries in-app idempotentes", () => {
  const decisions = new NotificationDeliveryPolicy().decide(
    event,
    [{ recipientId: "user-1" }, { recipientId: "user-1" }],
    new Map()
  )

  assert.deepEqual(decisions, [{
    deliveryKey: "people.activity:event-1:user-1:in_app",
    recipientId: "user-1",
    channel: "in_app",
    status: "pending",
  }])
})

test("evento opcional respeita preferência e remove o ator", () => {
  const decisions = new NotificationDeliveryPolicy().decide(
    event,
    [{ recipientId: "user-1" }, { recipientId: "actor-1" }],
    new Map([["user-1", { userId: "user-1", inAppEnabled: false }]])
  )
  assert.deepEqual(decisions, [])
})

test("evento obrigatório ignora silenciamento", () => {
  const decisions = new NotificationDeliveryPolicy().decide(
    { ...event, requirement: "mandatory" },
    [{ recipientId: "user-1" }],
    new Map([["user-1", { userId: "user-1", inAppEnabled: false }]])
  )
  assert.equal(decisions.length, 1)
})
