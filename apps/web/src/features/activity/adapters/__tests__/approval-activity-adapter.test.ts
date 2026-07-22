import assert from "node:assert/strict"
import test from "node:test"

import {
  APPROVAL_DOMAIN_EVENT_TYPES,
  createApprovalActor,
  createApprovalDomainEvent,
  type ApprovalDomainEvent,
  type ApprovalDomainEventType,
} from "../../../approval/domain"

import {
  ApprovalActivityAdapter,
  mapApprovalEventToActivity,
} from "../approval-activity-adapter"
import type {
  RecordActivityInput,
} from "../../schemas/activity-schema"
import {
  recordActivitySchema,
} from "../../schemas/activity-schema"

const aggregateId = "11111111-1111-4111-8111-111111111111"
const companyId = "22222222-2222-4222-8222-222222222222"
const actorId = "33333333-3333-4333-8333-333333333333"
const occurredAt = new Date("2026-01-10T12:00:00.000Z")

const EXPECTED_TITLES: Record<ApprovalDomainEventType, string> = {
  "approval.requested": "Aprovação solicitada",
  "approval.stage.activated": "Etapa de aprovação iniciada",
  "approval.assigned": "Aprovação atribuída",
  "approval.decision.recorded": "Decisão de aprovação registrada",
  "approval.approved": "Solicitação aprovada",
  "approval.rejected": "Solicitação rejeitada",
  "approval.withdrawn": "Solicitação de aprovação retirada",
  "approval.cancelled": "Solicitação de aprovação cancelada",
  "approval.expired": "Solicitação de aprovação expirada",
}

function createEvent(
  eventType: ApprovalDomainEventType
): ApprovalDomainEvent {
  return createApprovalDomainEvent({
    aggregateId,
    companyId,
    eventType,
    actor: createApprovalActor({
      actorType: "user",
      actorId,
      personId: "person-1",
      displayNameSnapshot: "Aprovador",
    }),
    occurredAt,
    aggregateVersion: 2,
    payload: {
      stageId: "stage-1",
      nested: {
        value: true,
      },
    },
  })
}

for (const eventType of APPROVAL_DOMAIN_EVENT_TYPES) {
  test(`${eventType} gera uma Activity compatível`, () => {
    const activity = mapApprovalEventToActivity(
      createEvent(eventType)
    )

    assert.ok(activity)
    assert.doesNotThrow(() =>
      recordActivitySchema.parse(activity)
    )
    assert.equal(activity.activityType, eventType)
    assert.equal(activity.title, EXPECTED_TITLES[eventType])
    assert.equal(activity.companyId, companyId)
    assert.equal(activity.module, "approval")
    assert.equal(activity.actorType, "user")
    assert.equal(activity.actorId, actorId)
    assert.equal(activity.entityType, "approval_request")
    assert.equal(activity.entityId, aggregateId)
    assert.equal(activity.visibility, "company")
    assert.equal(activity.metadata.approvalRequestId, aggregateId)
    assert.equal(activity.metadata.aggregateVersion, 2)
    assert.deepEqual(activity.metadata.nested, { value: true })
    assert.notEqual(activity.occurredAt, occurredAt)
    assert.equal(activity.occurredAt?.toISOString(), occurredAt.toISOString())
  })
}

test("evento desconhecido é ignorado", async () => {
  const published: RecordActivityInput[] = []
  const adapter = new ApprovalActivityAdapter(async (activity) => {
    published.push(activity)
  })
  const unknownEvent = {
    ...createEvent("approval.requested"),
    eventType: "approval.unknown",
  } as unknown as ApprovalDomainEvent

  const handled = await adapter.publish(unknownEvent)

  assert.equal(handled, false)
  assert.equal(published.length, 0)
})

test("adapter publica a Activity mapeada pelo contrato injetado", async () => {
  const published: RecordActivityInput[] = []
  const adapter = new ApprovalActivityAdapter(async (activity) => {
    published.push(activity)
  })

  const handled = await adapter.publish(
    createEvent("approval.approved")
  )

  assert.equal(handled, true)
  assert.equal(published.length, 1)
  assert.equal(published[0]?.activityType, "approval.approved")
})

test("adapter permanece stateless e delega idempotência ao publisher", async () => {
  const published: RecordActivityInput[] = []
  const adapter = new ApprovalActivityAdapter(async (activity) => {
    published.push(activity)
  })
  const event = createEvent("approval.requested")

  await adapter.publish(event)
  await adapter.publish(event)

  assert.equal(published.length, 2)
})
