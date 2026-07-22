import type {
  ApprovalActivityAdapter,
} from "../../activity/adapters"
import type {
  ApprovalOutboxEvent,
  ApprovalOutboxRepository,
} from "./approval-outbox-repository-contract"
import {
  getPendingApprovalOutboxEvents,
} from "./get-pending-approval-outbox-events"

export type ApprovalOutboxLogger = {
  info(event: string, context: Record<string, unknown>): void
  error(event: string, context: Record<string, unknown>): void
}

export type ProcessApprovalOutboxInput = {
  companyId: string
  batchSize?: number
  lockTimeoutSeconds?: number
}

export type ProcessApprovalOutboxResult = {
  claimed: number
  processed: number
  failed: number
  ignored: number
}

const defaultLogger: ApprovalOutboxLogger = {
  info(event, context) {
    console.info(JSON.stringify({ event, ...context }))
  },
  error(event, context) {
    console.error(JSON.stringify({ event, ...context }))
  },
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Falha desconhecida ao publicar a atividade."
}

export class ApprovalOutboxProcessor {
  constructor(
    private readonly repository: ApprovalOutboxRepository,
    private readonly activityAdapter: ApprovalActivityAdapter,
    private readonly logger: ApprovalOutboxLogger = defaultLogger,
    private readonly now: () => Date = () => new Date()
  ) {}

  async processBatch(
    input: ProcessApprovalOutboxInput
  ): Promise<ProcessApprovalOutboxResult> {
    const batchSize = input.batchSize ?? 25
    const lockTimeoutSeconds = input.lockTimeoutSeconds ?? 300
    const claimed = await getPendingApprovalOutboxEvents(
      this.repository,
      {
        companyId: input.companyId,
        batchSize,
        lockTimeoutSeconds,
      }
    )

    if (claimed.error) {
      this.logger.error("approval_outbox_claim_failed", {
        companyId: input.companyId,
        errorCode: claimed.error.code,
        error: claimed.error.message,
      })
      throw new Error(claimed.error.message)
    }

    const result: ProcessApprovalOutboxResult = {
      claimed: claimed.data.length,
      processed: 0,
      failed: 0,
      ignored: 0,
    }

    this.logger.info("approval_outbox_batch_started", {
      companyId: input.companyId,
      batchSize,
      claimed: result.claimed,
    })

    for (const event of claimed.data) {
      await this.processEvent(input.companyId, event, result)
    }

    this.logger.info("approval_outbox_batch_completed", {
      companyId: input.companyId,
      ...result,
    })

    return result
  }

  private async processEvent(
    companyId: string,
    event: ApprovalOutboxEvent,
    result: ProcessApprovalOutboxResult
  ): Promise<void> {
    try {
      const handled = await this.activityAdapter.publish(
        event.domainEvent,
        `approval:${event.eventKey}`
      )
      const completion = await this.repository.markProcessed({
        companyId,
        eventId: event.id,
        processingToken: event.processingToken,
        processedAt: this.now(),
      })

      if (completion.error) {
        throw new Error(completion.error.message)
      }

      if (handled) {
        result.processed += 1
      } else {
        result.ignored += 1
      }

      this.logger.info("approval_outbox_event_processed", {
        companyId,
        eventId: event.id,
        eventKey: event.eventKey,
        eventType: event.domainEvent.eventType,
        attemptCount: event.attemptCount,
        handled,
      })
    } catch (error) {
      result.failed += 1
      const message = errorMessage(error)
      const nextAttemptAt = this.nextAttemptAt(
        event.attemptCount
      )
      const failure = await this.repository.markFailed({
        companyId,
        eventId: event.id,
        processingToken: event.processingToken,
        error: message,
        nextAttemptAt,
      })

      this.logger.error("approval_outbox_event_failed", {
        companyId,
        eventId: event.id,
        eventKey: event.eventKey,
        eventType: event.domainEvent.eventType,
        attemptCount: event.attemptCount,
        nextAttemptAt: nextAttemptAt.toISOString(),
        error: message,
        markFailedError: failure.error?.message ?? null,
      })
    }
  }

  private nextAttemptAt(attemptCount: number): Date {
    const delaySeconds = Math.min(
      30 * 2 ** Math.max(0, attemptCount - 1),
      3600
    )

    return new Date(
      this.now().getTime() + delaySeconds * 1000
    )
  }
}
