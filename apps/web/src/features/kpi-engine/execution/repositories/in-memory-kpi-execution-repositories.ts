import type { KPIExecution, KPIExecutionAttempt } from "../domain"
import type { KPIExecutionAttemptRepository, KPIExecutionPage, KPIExecutionQuery, KPIExecutionRepository } from "./kpi-execution-repository"

export class InMemoryKPIExecutionRepository implements KPIExecutionRepository {
  private readonly items = new Map<string, KPIExecution>()
  async reserve(execution: KPIExecution) {
    const duplicate = [...this.items.values()].find((item) => item.companyId === execution.companyId &&
      item.providerKey === execution.providerKey && item.idempotencyKey === execution.idempotencyKey)
    if (duplicate) return Object.freeze({ reserved: false, execution: duplicate })
    this.items.set(execution.id, execution)
    return Object.freeze({ reserved: true, execution })
  }
  async save(execution: KPIExecution): Promise<void> { this.items.set(execution.id, execution) }
  async findById(companyId: string, id: string) { return this.items.get(id)?.companyId === companyId ? this.items.get(id) ?? null : null }
  async findByIdempotencyKey(companyId: string, providerKey: string, key: string) {
    return [...this.items.values()].find((item) => item.companyId === companyId && item.providerKey === providerKey && item.idempotencyKey === key) ?? null
  }
  async list(query: KPIExecutionQuery) {
    return page([...this.items.values()].filter((item) => item.companyId === query.companyId &&
      (query.providerKey === undefined || item.providerKey === query.providerKey) &&
      (query.status === undefined || item.status === query.status) &&
      (query.correlationId === undefined || item.correlationId === query.correlationId) &&
      (query.createdFrom === undefined || item.createdAt.getTime() >= query.createdFrom.getTime()) &&
      (query.createdUntil === undefined || item.createdAt.getTime() <= query.createdUntil.getTime())), query.page)
  }
}

export class InMemoryKPIExecutionAttemptRepository implements KPIExecutionAttemptRepository {
  private readonly items: KPIExecutionAttempt[] = []
  async save(attempt: KPIExecutionAttempt): Promise<void> {
    if (this.items.some((item) => item.executionId === attempt.executionId && item.attemptNumber === attempt.attemptNumber && item.id !== attempt.id)) {
      throw new Error("KPI_ATTEMPT_DUPLICATE_NUMBER")
    }
    const index = this.items.findIndex((item) => item.id === attempt.id)
    if (index >= 0) this.items[index] = attempt
    else this.items.push(attempt)
  }
  async listByExecution(executionId: string, pagination: KPIExecutionPage) {
    const ordered = this.items.filter((item) => item.executionId === executionId)
      .sort((left, right) => left.attemptNumber - right.attemptNumber)
    return Object.freeze(ordered.slice(pagination.offset, pagination.offset + pagination.limit))
  }
}

function page<T extends Readonly<{ createdAt?: Date; id: string }>>(items: readonly T[], pagination: KPIExecutionPage): readonly T[] {
  const ordered = [...items].sort((left, right) =>
    (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0) || left.id.localeCompare(right.id))
  return Object.freeze(ordered.slice(pagination.offset, pagination.offset + pagination.limit))
}
