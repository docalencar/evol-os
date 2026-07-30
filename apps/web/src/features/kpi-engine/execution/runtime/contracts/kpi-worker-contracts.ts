import type { KPIExecution } from "../../domain"
import type { ExecutionLease } from "../../leases"
import type { KPIExecutionPage } from "../../repositories"

export type KPIWorkerRuntimeStatus = "idle" | "starting" | "running" | "stopping" | "stopped" | "failed"
export type KPIWorkerRuntimeConfig = Readonly<{
  batchSize: number; maxRecoveriesPerCycle: number; maxRetriesPerCycle: number
  maxPendingPerCycle: number; leaseDurationMs: number; leaseRenewalThresholdMs: number
  maxConsecutiveFailures: number; emptyCycleDelayMs: number
  failureBackoffBaseMs: number; failureBackoffMaxMs: number; shutdownGracePeriodMs: number
}>
export type KPIWorkerRuntimeContext = Readonly<{
  workerId: string; runtimeId: string; companyId: string; providerKey?: string
}>
export type KPIWorkerRuntimeState = Readonly<{
  status: KPIWorkerRuntimeStatus; startedAt: Date | null; stoppedAt: Date | null
  failedAt: Date | null; lastCycleAt: Date | null; lastSuccessfulCycleAt: Date | null
  consecutiveFailures: number; consecutiveEmptyCycles: number; cycleRunning: boolean
}>
export type KPIWorkerPollingDecision = Readonly<{
  decision: "run_immediately" | "wait" | "backoff" | "stop"
  delayMs: number; reason: string
}>
export type KPIWorkerCycleResult = Readonly<{
  cycleId: string; status: "completed" | "failed" | "cancelled" | "empty"
  discovered: number; pendingProcessed: number; retriesProcessed: number
  recoveriesProcessed: number; succeeded: number; partiallySucceeded: number
  failed: number; startedAt: Date; finishedAt: Date; polling: KPIWorkerPollingDecision
}>
export type KPIWorkerRuntimeResult = Readonly<{ state: KPIWorkerRuntimeState; cycle?: KPIWorkerCycleResult }>
export interface KPIWorkerCancellationToken {
  isCancellationRequested(): boolean; throwIfCancellationRequested(): void; getReason(): string | null
}
export interface KPIWorkerCancellationSource {
  readonly token: KPIWorkerCancellationToken; cancel(reason: string): void
}
export interface KPIWorkerPollingStrategy {
  decide(input: Readonly<{ hadWork: boolean; hadError: boolean; hadRecovery: boolean
    leaseContention: boolean; consecutiveEmptyCycles: number; consecutiveFailures: number
    cancelled: boolean; runtimeStatus: KPIWorkerRuntimeStatus }>): KPIWorkerPollingDecision
}
export type KPIWorkerWorkType = "pending_execution" | "retry_execution" | "recovery_execution"
export type KPIWorkerWorkItem = Readonly<{
  type: KPIWorkerWorkType; execution: KPIExecution; priority: number
}>
export interface KPIWorkerWorkDiscovery {
  discover(input: Readonly<{ companyId: string; providerKey?: string; page: KPIExecutionPage
    maxPending: number; maxRetries: number; maxRecoveries: number; at: Date
  }>): Promise<readonly KPIWorkerWorkItem[]>
}
export interface KPIWorkerWorkPriority { priority(type: KPIWorkerWorkType): number }
export interface KPIWorkerHeartbeat {
  runHeartbeat(companyId: string, leases: readonly ExecutionLease[],
    token: KPIWorkerCancellationToken): Promise<Readonly<{ renewed: number; lost: number }>>
}
export type KPIWorkerHealthDTO = Readonly<{
  status: "healthy" | "degraded" | "unhealthy" | "stopped"; checkedAt: Date
  lastCycleAt: Date | null; lastSuccessfulCycleAt: Date | null
  consecutiveFailures: number; activeLeaseCount: number; reasonCodes: readonly string[]
}>
export interface KPIWorkerHealthService {
  getHealth(state: KPIWorkerRuntimeState, activeLeaseCount: number,
    cancellationRequested: boolean): KPIWorkerHealthDTO
}
export type KPIWorkerMetricName = "cyclesStarted" | "cyclesCompleted" | "cyclesFailed" |
  "cyclesCancelled" | "emptyCycles" | "workDiscovered" | "pendingProcessed" |
  "retriesProcessed" | "recoveriesProcessed" | "executionsSucceeded" |
  "executionsPartiallySucceeded" | "executionsFailed" | "leasesAcquired" |
  "leasesRenewed" | "leasesLost" | "pollingBackoffs" | "totalCycleDurationMs" |
  "lastCycleDurationMs"
export interface KPIWorkerMetrics { increment(name: KPIWorkerMetricName, value?: number): void }
export type KPIWorkerTelemetryEvent = Readonly<{
  kind: string; workerId: string; runtimeId: string; companyId: string
  providerKey?: string; executionId?: string; cycleId?: string; workType?: KPIWorkerWorkType
  status?: string; durationMs: number; reason?: string; counts?: Readonly<Record<string, number>>
}>
export interface KPIWorkerTelemetry { record(event: KPIWorkerTelemetryEvent): void | Promise<void> }
export interface KPIWorkerLifecycle { start(): Promise<KPIWorkerRuntimeResult>; stop(): Promise<KPIWorkerRuntimeResult> }
export interface KPIWorkerController extends KPIWorkerLifecycle {
  runCycle(token?: KPIWorkerCancellationToken): Promise<KPIWorkerCycleResult>
}
export interface KPIWorkerRuntime extends KPIWorkerController {
  fail(reason: string): Promise<KPIWorkerRuntimeResult>; getState(): KPIWorkerRuntimeState
  getHealth(): KPIWorkerHealthDTO
}
