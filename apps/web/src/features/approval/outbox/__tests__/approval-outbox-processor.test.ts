import assert from "node:assert/strict"
import test from "node:test"

import {
  ApprovalActivityAdapter,
} from "../../../activity/adapters"
import type {
  RecordActivityInput,
} from "../../../activity/schemas/activity-schema"
import {
  createApprovalActor,
  createApprovalDomainEvent,
} from "../../domain"
import {
  ApprovalOutboxProcessor,
  type ApprovalOutboxLogger,
} from "../approval-outbox-processor"
import type {
  ApprovalOutboxEvent,
  ApprovalOutboxRepository,
  ApprovalOutboxRepositoryError,
  ApprovalOutboxRepositoryResult,
  ClaimApprovalOutboxEventsInput,
  CompleteApprovalOutboxEventInput,
  FailApprovalOutboxEventInput,
} from "../approval-outbox-repository-contract"

const companyId = "22222222-2222-4222-8222-222222222222"
const now = new Date("2026-01-10T14:00:00.000Z")

type StoredEvent = ApprovalOutboxEvent & {
  processed: boolean
  claimed: boolean
}

function createOutboxEvent(index: number): StoredEvent {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    eventKey: `event-key-${index}`,
    processingToken: `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    attemptCount: 0,
    processed: false,
    claimed: false,
    domainEvent: createApprovalDomainEvent({
      aggregateId: "11111111-1111-4111-8111-111111111111",
      companyId,
      eventType: "approval.requested",
      actor: createApprovalActor({ actorType: "system" }),
      occurredAt: new Date("2026-01-10T12:00:00.000Z"),
      aggregateVersion: 1,
      payload: { index },
    }),
  }
}

class FakeOutboxRepository implements ApprovalOutboxRepository {
  readonly events: StoredEvent[]
  failedCalls: FailApprovalOutboxEventInput[] = []
  processedCalls: CompleteApprovalOutboxEventInput[] = []
  failNextCompletion = false

  constructor(events: StoredEvent[]) {
    this.events = events
  }

  async claimPending(
    input: ClaimApprovalOutboxEventsInput
  ): Promise<ApprovalOutboxRepositoryResult<ApprovalOutboxEvent[]>> {
    const events = this.events
      .filter((event) => !event.processed && !event.claimed)
      .slice(0, input.batchSize)

    for (const event of events) {
      event.claimed = true
      event.attemptCount += 1
    }

    return { data: events, error: null }
  }

  async markProcessed(
    input: CompleteApprovalOutboxEventInput
  ): Promise<ApprovalOutboxRepositoryResult<true>> {
    this.processedCalls.push(input)

    if (this.failNextCompletion) {
      this.failNextCompletion = false
      return {
        data: null,
        error: {
          code: "persistence_error",
          message: "Falha ao concluir claim.",
        },
      }
    }

    const event = this.events.find((item) => item.id === input.eventId)

    if (!event || !event.claimed) {
      return claimLost()
    }

    event.processed = true
    event.claimed = false
    return { data: true, error: null }
  }

  async markFailed(
    input: FailApprovalOutboxEventInput
  ): Promise<ApprovalOutboxRepositoryResult<true>> {
    this.failedCalls.push(input)
    const event = this.events.find((item) => item.id === input.eventId)

    if (!event || !event.claimed) {
      return claimLost()
    }

    event.claimed = false
    return { data: true, error: null }
  }
}

function claimLost(): ApprovalOutboxRepositoryResult<true> {
  const error: ApprovalOutboxRepositoryError = {
    code: "claim_lost",
    message: "Claim perdido.",
  }
  return { data: null, error }
}

function createLogger(): ApprovalOutboxLogger & {
  entries: Array<{ level: string; event: string }>
} {
  const entries: Array<{ level: string; event: string }> = []

  return {
    entries,
    info(event) {
      entries.push({ level: "info", event })
    },
    error(event) {
      entries.push({ level: "error", event })
    },
  }
}

function createProcessor(
  repository: FakeOutboxRepository,
  publisher: (activity: RecordActivityInput) => Promise<unknown>,
  logger = createLogger()
) {
  return {
    processor: new ApprovalOutboxProcessor(
      repository,
      new ApprovalActivityAdapter(publisher),
      logger,
      () => new Date(now.getTime())
    ),
    logger,
  }
}

test("processamento com sucesso publica antes de concluir", async () => {
  const event = createOutboxEvent(1)
  const repository = new FakeOutboxRepository([event])
  const order: string[] = []
  const originalMarkProcessed = repository.markProcessed.bind(repository)
  repository.markProcessed = async (input) => {
    order.push("processed")
    return originalMarkProcessed(input)
  }
  const { processor } = createProcessor(repository, async (activity) => {
    order.push("published")
    assert.equal(activity.idempotencyKey, "approval:event-key-1")
  })

  const result = await processor.processBatch({ companyId })

  assert.deepEqual(order, ["published", "processed"])
  assert.deepEqual(result, {
    claimed: 1,
    processed: 1,
    failed: 0,
    ignored: 0,
  })
  assert.equal(event.processed, true)
})

test("falha na publicação mantém o evento pendente", async () => {
  const event = createOutboxEvent(1)
  const repository = new FakeOutboxRepository([event])
  const { processor, logger } = createProcessor(
    repository,
    async () => {
      throw new Error("Activity indisponível.")
    }
  )

  const result = await processor.processBatch({ companyId })

  assert.equal(result.failed, 1)
  assert.equal(event.processed, false)
  assert.equal(event.claimed, false)
  assert.equal(repository.processedCalls.length, 0)
  assert.equal(repository.failedCalls.length, 1)
  assert.ok(
    logger.entries.some(
      (entry) => entry.event === "approval_outbox_event_failed"
    )
  )
})

test("retry processa evento liberado depois de uma falha", async () => {
  const event = createOutboxEvent(1)
  const repository = new FakeOutboxRepository([event])
  let publications = 0
  const { processor } = createProcessor(repository, async () => {
    publications += 1
    if (publications === 1) {
      throw new Error("Falha transitória.")
    }
  })

  const first = await processor.processBatch({ companyId })
  const second = await processor.processBatch({ companyId })

  assert.equal(first.failed, 1)
  assert.equal(second.processed, 1)
  assert.equal(event.attemptCount, 2)
  assert.equal(event.processed, true)
})

test("retry após falha de conclusão reutiliza a chave idempotente", async () => {
  const event = createOutboxEvent(1)
  const repository = new FakeOutboxRepository([event])
  repository.failNextCompletion = true
  const activities = new Map<string, RecordActivityInput>()
  const { processor } = createProcessor(repository, async (activity) => {
    const key = activity.idempotencyKey
    assert.ok(key)
    activities.set(key, activity)
  })

  const first = await processor.processBatch({ companyId })
  const second = await processor.processBatch({ companyId })

  assert.equal(first.failed, 1)
  assert.equal(second.processed, 1)
  assert.equal(activities.size, 1)
  assert.equal(event.processed, true)
})

test("processamento em lote respeita o batchSize", async () => {
  const events = [
    createOutboxEvent(1),
    createOutboxEvent(2),
    createOutboxEvent(3),
  ]
  const repository = new FakeOutboxRepository(events)
  const { processor } = createProcessor(repository, async () => undefined)

  const result = await processor.processBatch({
    companyId,
    batchSize: 2,
  })

  assert.equal(result.claimed, 2)
  assert.equal(result.processed, 2)
  assert.equal(events.filter((event) => event.processed).length, 2)
})

test("evento já processado não é reivindicado", async () => {
  const event = createOutboxEvent(1)
  event.processed = true
  const repository = new FakeOutboxRepository([event])
  let publications = 0
  const { processor } = createProcessor(repository, async () => {
    publications += 1
  })

  const result = await processor.processBatch({ companyId })

  assert.equal(result.claimed, 0)
  assert.equal(publications, 0)
})

test("lista vazia encerra o lote sem publicações", async () => {
  const repository = new FakeOutboxRepository([])
  let publications = 0
  const { processor } = createProcessor(repository, async () => {
    publications += 1
  })

  const result = await processor.processBatch({ companyId })

  assert.deepEqual(result, {
    claimed: 0,
    processed: 0,
    failed: 0,
    ignored: 0,
  })
  assert.equal(publications, 0)
})
