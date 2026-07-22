import type {
  ApprovalContextValue,
  ApprovalDomainEvent,
  ApprovalDomainEventType,
} from "../../approval/domain"

import type {
  RecordActivityInput,
} from "../schemas/activity-schema"
import type {
  ActivityMetadata,
} from "../types/activity"

const APPROVAL_ACTIVITY_TITLES: Record<
  ApprovalDomainEventType,
  string
> = {
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

export type ActivityPublisher = (
  activity: RecordActivityInput
) => Promise<unknown>

export type MappedApprovalActivity =
  RecordActivityInput & {
    metadata: ActivityMetadata
    occurredAt: Date
  }

function cloneMetadataValue(
  value: ApprovalContextValue
): ApprovalContextValue {
  if (Array.isArray(value)) {
    return value.map(cloneMetadataValue)
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        cloneMetadataValue(item),
      ])
    )
  }

  return value
}

export function mapApprovalEventToActivity(
  event: ApprovalDomainEvent
): MappedApprovalActivity | null {
  const title = APPROVAL_ACTIVITY_TITLES[event.eventType]

  if (!title) {
    return null
  }

  return {
    companyId: event.companyId,
    activityType: event.eventType,
    module: "approval",
    title,
    description: null,
    actorType: event.actor.actorType,
    actorId: event.actor.actorId,
    entityType: "approval_request",
    entityId: event.aggregateId,
    visibility: "company",
    metadata: {
      approvalRequestId: event.aggregateId,
      aggregateVersion: event.aggregateVersion,
      actorPersonId: event.actor.personId,
      actorDisplayName: event.actor.displayNameSnapshot,
      ...Object.fromEntries(
        Object.entries(event.payload).map(([key, value]) => [
          key,
          cloneMetadataValue(value),
        ])
      ),
    },
    occurredAt: new Date(event.occurredAt.getTime()),
  }
}

export class ApprovalActivityAdapter {
  constructor(
    private readonly publisher: ActivityPublisher
  ) {}

  async publish(event: ApprovalDomainEvent): Promise<boolean> {
    const activity = mapApprovalEventToActivity(event)

    if (!activity) {
      return false
    }

    await this.publisher(activity)
    return true
  }
}
