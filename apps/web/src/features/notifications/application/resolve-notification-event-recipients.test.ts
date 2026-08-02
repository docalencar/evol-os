import assert from "node:assert/strict"
import test from "node:test"

import type { NotificationRecipientDirectory } from "../directory"
import type { NotificationEvent } from "../domain/notification-event"
import { resolveNotificationEventRecipients } from "./resolve-notification-event-recipients"

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

function directory(): NotificationRecipientDirectory {
  return {
    async findUserIdByEmployeeId() {
      return "employee-user"
    },
    async findManagerUserId() {
      return "manager-user"
    },
    async findTeamLeaderUserId() {
      return "team-leader"
    },
    async findDepartmentLeaderUserId() {
      return "department-leader"
    },
  }
}

test("resolver encontra pessoa e gestor no evento employee.updated", async () => {
  const recipients = await resolveNotificationEventRecipients(event, directory())
  assert.deepEqual(recipients, [
    { recipientId: "employee-user" },
    { recipientId: "manager-user" },
  ])
})

test("resolver remove ator e duplicatas", async () => {
  const recipients = await resolveNotificationEventRecipients(
    { ...event, actorId: "same-user" },
    {
      ...directory(),
      async findUserIdByEmployeeId() {
        return "same-user"
      },
      async findManagerUserId() {
        return "same-user"
      },
    }
  )
  assert.deepEqual(recipients, [])
})

test("resolver de Organization usa o líder da entidade", async () => {
  const recipients = await resolveNotificationEventRecipients(
    {
      ...event,
      producerKey: "organization.activity",
      eventType: "team.updated",
      entityType: "team",
      entityId: "team-1",
      subjectType: null,
      subjectId: null,
    },
    directory()
  )
  assert.deepEqual(recipients, [{ recipientId: "team-leader" }])
})
