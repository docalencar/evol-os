import assert from "node:assert/strict"
import test from "node:test"

import type { NotificationEvent } from "../domain/notification-event"
import {
  TrustedNotificationPersistenceService,
  type TrustedNotificationPersistenceGateway,
} from "./trusted-notification-persistence"

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

test("Trusted Persistence delega contrato validado ao gateway", async () => {
  let calls = 0
  const gateway: TrustedNotificationPersistenceGateway = {
    async persist() {
      calls += 1
      return { eventId: "event-id", deliveryIds: ["delivery-id"] }
    },
  }
  const service = new TrustedNotificationPersistenceService(gateway)
  const result = await service.persist(event, [{
    deliveryKey: "people.activity:event-1:user-1:in_app",
    recipientId: "user-1",
    channel: "in_app",
    status: "pending",
  }])

  assert.equal(calls, 1)
  assert.equal(result?.eventId, "event-id")
})

test("Trusted Persistence não chama gateway sem delivery", async () => {
  const gateway: TrustedNotificationPersistenceGateway = {
    async persist() {
      assert.fail("gateway não deveria ser chamado")
    },
  }
  const result = await new TrustedNotificationPersistenceService(gateway)
    .persist(event, [])
  assert.equal(result, null)
})

test("Trusted Persistence rejeita delivery duplicada e ator", async () => {
  const gateway: TrustedNotificationPersistenceGateway = {
    async persist() {
      return { eventId: "event-id", deliveryIds: [] }
    },
  }
  const service = new TrustedNotificationPersistenceService(gateway)
  const delivery = {
    deliveryKey: "duplicate",
    recipientId: "user-1",
    channel: "in_app" as const,
    status: "pending" as const,
  }

  await assert.rejects(() => service.persist(event, [delivery, delivery]))
  await assert.rejects(() => service.persist(event, [{
    ...delivery,
    deliveryKey: "actor",
    recipientId: "actor-1",
  }]))
})
