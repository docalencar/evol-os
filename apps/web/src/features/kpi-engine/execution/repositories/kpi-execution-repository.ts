import type { KPIExecution, KPIExecutionAttempt, KPIExecutionStatus } from "../domain"

export type KPIExecutionPage = Readonly<{ limit: number; offset: number }>
export type KPIExecutionQuery = Readonly<{
  companyId: string
  providerKey?: string
  status?: KPIExecutionStatus
  correlationId?: string
  createdFrom?: Date
  createdUntil?: Date
  page: KPIExecutionPage
}>

export interface KPIExecutionRepository {
  reserve(execution: KPIExecution): Promise<Readonly<{ reserved: boolean; execution: KPIExecution }>>
  save(execution: KPIExecution): Promise<void>
  findById(companyId: string, id: string): Promise<KPIExecution | null>
  findByIdempotencyKey(companyId: string, providerKey: string, key: string): Promise<KPIExecution | null>
  list(query: KPIExecutionQuery): Promise<readonly KPIExecution[]>
}

export interface KPIExecutionAttemptRepository {
  save(attempt: KPIExecutionAttempt): Promise<void>
  listByExecution(executionId: string, page: KPIExecutionPage): Promise<readonly KPIExecutionAttempt[]>
}

export interface DurableKPIExecutionStore {
  startAttempt(execution: KPIExecution, attempt: KPIExecutionAttempt): Promise<void>
  completeAttempt(execution: KPIExecution, attempt: KPIExecutionAttempt): Promise<void>
  failAttempt(execution: KPIExecution, attempt: KPIExecutionAttempt): Promise<void>
  interruptAttempt(execution: KPIExecution, attempt: KPIExecutionAttempt): Promise<void>
}
