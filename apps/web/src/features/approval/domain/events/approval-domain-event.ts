import type {
  ApprovalActor,
  ApprovalContextValue,
} from "../value-objects"

export const APPROVAL_DOMAIN_EVENT_TYPES = [
  "approval.requested",
  "approval.stage.activated",
  "approval.assigned",
  "approval.decision.recorded",
  "approval.approved",
  "approval.rejected",
  "approval.withdrawn",
  "approval.cancelled",
  "approval.expired",
] as const

export type ApprovalDomainEventType =
  (typeof APPROVAL_DOMAIN_EVENT_TYPES)[number]

export type ApprovalDomainEvent = Readonly<{
  aggregateId: string
  companyId: string
  eventType: ApprovalDomainEventType
  actor: ApprovalActor
  occurredAt: Date
  aggregateVersion: number
  payload: Readonly<
    Record<string, ApprovalContextValue>
  >
}>

export type CreateApprovalDomainEventInput = {
  aggregateId: string
  companyId: string
  eventType: ApprovalDomainEventType
  actor: ApprovalActor
  occurredAt: Date
  aggregateVersion: number
  payload?: Record<string, ApprovalContextValue>
}

export function createApprovalDomainEvent(
  input: CreateApprovalDomainEventInput
): ApprovalDomainEvent {
  return Object.freeze({
    ...input,
    occurredAt: new Date(input.occurredAt.getTime()),
    payload: Object.freeze({ ...(input.payload ?? {}) }),
  })
}
