import type { Clock, IdGenerator } from "../../.."
import type { ExecutionCoordinator } from "../../coordination"
import type { ExecutionDispatcher } from "../../dispatcher"
import type { ExecutionLease } from "../../leases"
import type { KPIRecoveryRequestResolver, RecoveryCoordinator } from "../../recovery"
import type {
  KPIWorkerCancellationToken, KPIWorkerCycleResult, KPIWorkerHealthService,
  KPIWorkerHeartbeat, KPIWorkerMetrics, KPIWorkerPollingStrategy, KPIWorkerRuntime,
  KPIWorkerRuntimeConfig, KPIWorkerRuntimeContext, KPIWorkerRuntimeState,
  KPIWorkerTelemetry, KPIWorkerWorkDiscovery, KPIWorkerWorkItem,
} from "../contracts"
import { KPIWorkerError, createKPIWorkerRuntimeState, transitionKPIWorkerState } from "../domain"
import { CooperativeKPIWorkerCancellationSource, NeverCancelledKPIWorkerToken } from "../lifecycle"

export class DefaultKPIWorkerRuntime implements KPIWorkerRuntime {
  private state: KPIWorkerRuntimeState = createKPIWorkerRuntimeState()
  private cancellation = new CooperativeKPIWorkerCancellationSource()
  private activeLeases: ExecutionLease[] = []

  constructor(private readonly context: KPIWorkerRuntimeContext,
    private readonly config: KPIWorkerRuntimeConfig, private readonly discovery: KPIWorkerWorkDiscovery,
    private readonly recovery: RecoveryCoordinator, private readonly resolver: KPIRecoveryRequestResolver,
    private readonly dispatcher: ExecutionDispatcher, private readonly coordinator: ExecutionCoordinator,
    private readonly heartbeat: KPIWorkerHeartbeat, private readonly polling: KPIWorkerPollingStrategy,
    private readonly health: KPIWorkerHealthService, private readonly metrics: KPIWorkerMetrics,
    private readonly telemetry: KPIWorkerTelemetry, private readonly clock: Clock,
    private readonly ids: IdGenerator) {}

  async start() {
    if (this.state.status === "running" || this.state.status === "starting") {
      throw new KPIWorkerError("RUNTIME_ALREADY_RUNNING", "Runtime já iniciado.")
    }
    this.cancellation = new CooperativeKPIWorkerCancellationSource()
    this.state = transitionKPIWorkerState(this.state, "starting", this.clock.now())
    await this.emit("worker_starting", 0)
    this.state = transitionKPIWorkerState(this.state, "running", this.clock.now())
    await this.emit("worker_started", 0)
    return Object.freeze({ state: this.state })
  }

  async stop() {
    if (this.state.status !== "running") throw new KPIWorkerError("SHUTDOWN_FAILURE", "Runtime não está ativo.")
    this.state = transitionKPIWorkerState(this.state, "stopping", this.clock.now())
    this.cancellation.cancel("graceful_shutdown")
    await this.emit("worker_stopping", 0)
    for (const lease of [...this.activeLeases]) await this.coordinator.release(this.context.companyId, lease)
    this.activeLeases = []
    this.state = transitionKPIWorkerState(this.state, "stopped", this.clock.now())
    await this.emit("worker_stopped", 0)
    return Object.freeze({ state: this.state })
  }

  async fail(reason: string) {
    if (this.state.status !== "running" && this.state.status !== "starting") {
      throw new KPIWorkerError("INVALID_RUNTIME_TRANSITION", "Runtime não pode falhar neste estado.")
    }
    this.state = transitionKPIWorkerState(this.state, "failed", this.clock.now())
    await this.emit("worker_failed", 0, reason)
    return Object.freeze({ state: this.state })
  }

  async runCycle(token: KPIWorkerCancellationToken = new NeverCancelledKPIWorkerToken()): Promise<KPIWorkerCycleResult> {
    if (this.state.status !== "running") throw new KPIWorkerError("RUNTIME_NOT_RUNNING", "Runtime não iniciado.")
    if (this.state.cycleRunning) throw new KPIWorkerError("CYCLE_ALREADY_RUNNING", "Já existe ciclo ativo.")
    const cycleId = this.ids.generate(); const startedAt = this.clock.now()
    this.state = Object.freeze({ ...this.state, cycleRunning: true })
    this.metrics.increment("cyclesStarted"); await this.emit("worker_cycle_started", 0, undefined, cycleId)
    try {
      this.checkCancellation(token)
      await this.emit("work_discovery_started", 0, undefined, cycleId)
      const work = await this.discovery.discover({ companyId: this.context.companyId,
        providerKey: this.context.providerKey, page: { limit: this.config.batchSize, offset: 0 },
        maxPending: this.config.maxPendingPerCycle, maxRetries: this.config.maxRetriesPerCycle,
        maxRecoveries: this.config.maxRecoveriesPerCycle, at: this.clock.now() })
      this.metrics.increment("workDiscovered", work.length)
      await this.emit("work_discovery_completed", 0, undefined, cycleId)
      this.checkCancellation(token)
      const aggregate = await this.processWork(work, token, cycleId)
      this.checkCancellation(token)
      await this.heartbeat.runHeartbeat(this.context.companyId, this.activeLeases, token)
      this.checkCancellation(token)
      const empty = work.length === 0
      const finishedAt = this.clock.now(); const duration = finishedAt.getTime() - startedAt.getTime()
      const failures = aggregate.failed > 0 ? this.state.consecutiveFailures + 1 : 0
      const empties = empty ? this.state.consecutiveEmptyCycles + 1 : 0
      const polling = this.polling.decide({ hadWork: !empty, hadError: aggregate.failed > 0,
        hadRecovery: aggregate.recoveriesProcessed > 0, leaseContention: aggregate.leaseContention,
        consecutiveEmptyCycles: empties, consecutiveFailures: failures, cancelled: false,
        runtimeStatus: this.state.status })
      this.state = Object.freeze({ ...this.state, cycleRunning: false, lastCycleAt: finishedAt,
        lastSuccessfulCycleAt: aggregate.failed === 0 ? finishedAt : this.state.lastSuccessfulCycleAt,
        consecutiveFailures: failures, consecutiveEmptyCycles: empties })
      this.recordCompletedMetrics(empty, aggregate, duration, polling.decision === "backoff")
      await this.emit(empty ? "worker_cycle_empty" : "worker_cycle_completed", duration, undefined, cycleId)
      return Object.freeze({ cycleId, status: empty ? "empty" : aggregate.failed > 0 ? "failed" : "completed",
        discovered: work.length, ...aggregate, startedAt, finishedAt, polling })
    } catch (error) {
      return this.handleCycleError(error, cycleId, startedAt, token)
    }
  }

  getState(): KPIWorkerRuntimeState { return this.state }
  getHealth() { return this.health.getHealth(this.state, this.activeLeases.length,
    this.cancellation.token.isCancellationRequested()) }

  private async processWork(work: readonly KPIWorkerWorkItem[], token: KPIWorkerCancellationToken,
    cycleId: string) {
    let pendingProcessed = 0; let retriesProcessed = 0; let recoveriesProcessed = 0
    let succeeded = 0; let partiallySucceeded = 0; let failed = 0; let leaseContention = false
    if (work.some((item) => item.type === "recovery_execution")) {
      const results = await this.recovery.recover(this.context.companyId,
        { limit: this.config.maxRecoveriesPerCycle, offset: 0 })
      recoveriesProcessed = results.length
      succeeded += results.filter((item) => item.status === "recovered").length
      failed += results.filter((item) => item.status === "failed").length
    }
    for (const item of work.filter((candidate) => candidate.type !== "recovery_execution")) {
      this.checkCancellation(token); await this.emit("work_item_started", 0, undefined, cycleId, item)
      const lease = await this.coordinator.acquire(this.context.companyId, item.execution.id)
      if (!lease) { leaseContention = true; await this.emit("work_item_skipped", 0, "lease_contention", cycleId, item); continue }
      this.activeLeases.push(lease); this.metrics.increment("leasesAcquired")
      const request = await this.resolver.resolve(item.execution)
      if (!request) { failed += 1; await this.emit("work_item_failed", 0, "request_unresolved", cycleId, item) }
      else {
        const result = await this.dispatcher.dispatch(request)
        if (result.status === "succeeded") succeeded += 1
        else if (result.status === "partial") partiallySucceeded += 1
        else failed += 1
        await this.emit("work_item_completed", 0, undefined, cycleId, item)
      }
      await this.coordinator.release(this.context.companyId, lease)
      this.activeLeases = this.activeLeases.filter((active) => active.leaseId !== lease.leaseId)
      if (item.type === "pending_execution") pendingProcessed += 1
      else retriesProcessed += 1
      this.checkCancellation(token)
    }
    return { pendingProcessed, retriesProcessed, recoveriesProcessed, succeeded,
      partiallySucceeded, failed, leaseContention }
  }

  private checkCancellation(token: KPIWorkerCancellationToken): void {
    this.cancellation.token.throwIfCancellationRequested(); token.throwIfCancellationRequested()
  }
  private recordCompletedMetrics(empty: boolean, result: Awaited<ReturnType<DefaultKPIWorkerRuntime["processWork"]>>,
    duration: number, backoff: boolean): void {
    this.metrics.increment("cyclesCompleted"); if (empty) this.metrics.increment("emptyCycles")
    this.metrics.increment("pendingProcessed", result.pendingProcessed)
    this.metrics.increment("retriesProcessed", result.retriesProcessed)
    this.metrics.increment("recoveriesProcessed", result.recoveriesProcessed)
    this.metrics.increment("executionsSucceeded", result.succeeded)
    this.metrics.increment("executionsPartiallySucceeded", result.partiallySucceeded)
    this.metrics.increment("executionsFailed", result.failed)
    if (backoff) this.metrics.increment("pollingBackoffs")
    this.metrics.increment("totalCycleDurationMs", duration); this.metrics.increment("lastCycleDurationMs", duration)
  }
  private async handleCycleError(error: unknown, cycleId: string, startedAt: Date,
    token: KPIWorkerCancellationToken): Promise<KPIWorkerCycleResult> {
    const finishedAt = this.clock.now(); const cancelled = token.isCancellationRequested() ||
      this.cancellation.token.isCancellationRequested() || error instanceof KPIWorkerError && error.code === "WORKER_CANCELLED"
    this.state = Object.freeze({ ...this.state, cycleRunning: false, lastCycleAt: finishedAt,
      consecutiveFailures: cancelled ? this.state.consecutiveFailures : this.state.consecutiveFailures + 1 })
    this.metrics.increment(cancelled ? "cyclesCancelled" : "cyclesFailed")
    await this.emit(cancelled ? "worker_cycle_cancelled" : "worker_cycle_failed",
      finishedAt.getTime() - startedAt.getTime(), error instanceof Error ? error.message : "cycle_failed", cycleId)
    const polling = this.polling.decide({ hadWork: false, hadError: !cancelled, hadRecovery: false,
      leaseContention: false, consecutiveEmptyCycles: this.state.consecutiveEmptyCycles,
      consecutiveFailures: this.state.consecutiveFailures, cancelled, runtimeStatus: this.state.status })
    return Object.freeze({ cycleId, status: cancelled ? "cancelled" : "failed", discovered: 0,
      pendingProcessed: 0, retriesProcessed: 0, recoveriesProcessed: 0, succeeded: 0,
      partiallySucceeded: 0, failed: cancelled ? 0 : 1, startedAt, finishedAt, polling })
  }
  private async emit(kind: string, durationMs: number, reason?: string, cycleId?: string,
    item?: KPIWorkerWorkItem): Promise<void> {
    await this.telemetry.record(Object.freeze({ kind, ...this.context, durationMs, reason, cycleId,
      executionId: item?.execution.id, workType: item?.type, status: kind }))
  }
}
