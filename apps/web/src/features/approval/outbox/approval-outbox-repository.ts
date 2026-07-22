import {
  createApprovalActor,
  createApprovalDomainEvent,
  type ApprovalContextValue,
  type ApprovalDomainEventType,
} from "../domain"
import type {
  ApprovalOutboxEvent,
  ApprovalOutboxRepository,
  ApprovalOutboxRepositoryError,
} from "./approval-outbox-repository-contract"

type ApprovalOutboxRow = {
  id: string
  event_key: string
  approval_request_id: string
  company_id: string
  event_type: ApprovalDomainEventType
  actor_type: "user" | "system" | "automation" | "integration"
  actor_id: string | null
  actor_person_id: string | null
  actor_display_name_snapshot: string | null
  occurred_at: string
  aggregate_version: number
  payload: Record<string, ApprovalContextValue>
  processing_token: string
  attempt_count: number
}

export type ApprovalOutboxDatabaseClient = {
  rpc(
    functionName: string,
    parameters: Record<string, unknown>
  ): Promise<{
    data: unknown
    error: { message: string } | null
  }>
}

function persistenceError(
  message: string
): ApprovalOutboxRepositoryError {
  return { code: "persistence_error", message }
}

function mapRow(row: ApprovalOutboxRow): ApprovalOutboxEvent {
  return {
    id: row.id,
    eventKey: row.event_key,
    processingToken: row.processing_token,
    attemptCount: row.attempt_count,
    domainEvent: createApprovalDomainEvent({
      aggregateId: row.approval_request_id,
      companyId: row.company_id,
      eventType: row.event_type,
      actor: createApprovalActor({
        actorType: row.actor_type,
        actorId: row.actor_id,
        personId: row.actor_person_id,
        displayNameSnapshot:
          row.actor_display_name_snapshot,
      }),
      occurredAt: new Date(row.occurred_at),
      aggregateVersion: row.aggregate_version,
      payload: row.payload,
    }),
  }
}

export function createApprovalOutboxRepository(
  database: ApprovalOutboxDatabaseClient
): ApprovalOutboxRepository {
  return {
    async claimPending(input) {
      const { data, error } = await database.rpc(
        "claim_approval_domain_events",
        {
          p_company_id: input.companyId,
          p_batch_size: input.batchSize,
          p_lock_timeout_seconds: input.lockTimeoutSeconds,
        }
      )

      if (error) {
        return {
          data: null,
          error: persistenceError(error.message),
        }
      }

      try {
        return {
          data: ((data ?? []) as ApprovalOutboxRow[]).map(mapRow),
          error: null,
        }
      } catch (error) {
        return {
          data: null,
          error: persistenceError(
            error instanceof Error
              ? error.message
              : "Não foi possível hidratar os eventos da outbox."
          ),
        }
      }
    },

    async markProcessed(input) {
      const { data, error } = await database.rpc(
        "complete_approval_domain_event",
        {
          p_company_id: input.companyId,
          p_event_id: input.eventId,
          p_processing_token: input.processingToken,
          p_processed_at: input.processedAt.toISOString(),
        }
      )

      if (error) {
        return {
          data: null,
          error: persistenceError(error.message),
        }
      }

      if (data !== true) {
        return {
          data: null,
          error: {
            code: "claim_lost",
            message: "O claim do evento não está mais ativo.",
          },
        }
      }

      return { data: true, error: null }
    },

    async markFailed(input) {
      const { data, error } = await database.rpc(
        "fail_approval_domain_event",
        {
          p_company_id: input.companyId,
          p_event_id: input.eventId,
          p_processing_token: input.processingToken,
          p_error: input.error,
          p_next_attempt_at: input.nextAttemptAt.toISOString(),
        }
      )

      if (error) {
        return {
          data: null,
          error: persistenceError(error.message),
        }
      }

      if (data !== true) {
        return {
          data: null,
          error: {
            code: "claim_lost",
            message: "O claim do evento não está mais ativo.",
          },
        }
      }

      return { data: true, error: null }
    },
  }
}
