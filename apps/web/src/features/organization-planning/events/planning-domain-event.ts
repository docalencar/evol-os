export const PLANNING_DOMAIN_EVENT_TYPES = [
  "planning.scenario.created",
  "planning.scenario.submitted",
  "planning.scenario.approved",
  "planning.scenario.rejected",
  "planning.scenario.published",
  "planning.scenario.archived",
  "planning.snapshot.published",
] as const

export type PlanningDomainEventType =
  (typeof PLANNING_DOMAIN_EVENT_TYPES)[number]

export type PlanningDomainEvent = Readonly<{
  type: PlanningDomainEventType
  companyId: string
  aggregateId: string
  aggregateVersion: number
  occurredAt: Date
  payload: Readonly<Record<string, unknown>>
}>

export function createPlanningDomainEvent(
  event: PlanningDomainEvent
): PlanningDomainEvent {
  return Object.freeze({
    ...event,
    occurredAt: new Date(event.occurredAt.getTime()),
    payload: Object.freeze({ ...event.payload }),
  })
}

export type PlanningScenarioCreated = PlanningDomainEvent &
  Readonly<{ type: "planning.scenario.created" }>
export type PlanningScenarioSubmitted = PlanningDomainEvent &
  Readonly<{ type: "planning.scenario.submitted" }>
export type PlanningScenarioApproved = PlanningDomainEvent &
  Readonly<{ type: "planning.scenario.approved" }>
export type PlanningScenarioRejected = PlanningDomainEvent &
  Readonly<{ type: "planning.scenario.rejected" }>
export type PlanningScenarioPublished = PlanningDomainEvent &
  Readonly<{ type: "planning.scenario.published" }>
export type PlanningScenarioArchived = PlanningDomainEvent &
  Readonly<{ type: "planning.scenario.archived" }>
export type SnapshotPublished = PlanningDomainEvent &
  Readonly<{ type: "planning.snapshot.published" }>
