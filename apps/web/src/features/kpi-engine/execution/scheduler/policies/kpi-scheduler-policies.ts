import type { Clock } from "../../.."
import type { KPIBackpressurePolicy, KPITriggerDeduplicator, KPITriggerRequest,
  KPIRateLimiter, KPIScheduleContext, KPISchedulePolicy, KPISchedulePolicyResult } from "../contracts"
import type { KPISchedulerConfig } from "../domain"

export class DeterministicKPIBackpressurePolicy implements KPIBackpressurePolicy {
  constructor(private readonly config: KPISchedulerConfig) {}
  evaluate(context: KPIScheduleContext) {
    if (context.queueSize >= this.config.backpressureQueueThreshold * 2 ||
      context.recentFailures >= this.config.backpressureFailureThreshold * 2) {
      return Object.freeze({ decision: "reject" as const, delayMs: 0 })
    }
    if (context.queueSize >= this.config.backpressureQueueThreshold ||
      context.activeLeases >= this.config.backpressureLeaseThreshold ||
      context.recentFailures >= this.config.backpressureFailureThreshold) {
      return Object.freeze({ decision: "delay" as const, delayMs: this.config.backpressureDelayMs })
    }
    return Object.freeze({ decision: "continue" as const, delayMs: 0 })
  }
}
type WindowEntry = Readonly<{ key: string; at: number }>
export class ClockBasedKPIRateLimiter implements KPIRateLimiter {
  private entries: WindowEntry[] = []
  constructor(private readonly clock: Clock, private readonly config: KPISchedulerConfig) {}
  consume(request: KPITriggerRequest): boolean {
    const now = this.clock.now().getTime(); const key = `${request.companyId}:${request.providerKey ?? "*"}`
    this.entries = this.entries.filter((entry) => now - entry.at < this.config.rateLimitWindowMs)
    if (this.entries.filter((entry) => entry.key === key).length >= this.config.maxRequestsPerWindow) return false
    this.entries.push(Object.freeze({ key, at: now })); return true
  }
}
export class WindowedKPITriggerDeduplicator implements KPITriggerDeduplicator {
  private entries: WindowEntry[] = []
  constructor(private readonly clock: Clock, private readonly config: KPISchedulerConfig) {}
  isDuplicate(request: KPITriggerRequest): boolean {
    const now = this.clock.now().getTime()
    const key = `${request.triggerId}:${request.companyId}:${request.providerKey ?? "*"}:${request.reason}`
    this.entries = this.entries.filter((entry) => now - entry.at < this.config.deduplicationWindowMs)
    if (this.entries.some((entry) => entry.key === key)) return true
    this.entries.push(Object.freeze({ key, at: now })); return false
  }
}
export class DefaultSchedulePolicy implements KPISchedulePolicy {
  constructor(private readonly config: KPISchedulerConfig, private readonly backpressure: KPIBackpressurePolicy,
    private readonly rateLimiter: KPIRateLimiter, private readonly deduplicator: KPITriggerDeduplicator) {}
  evaluate(request: KPITriggerRequest, context: KPIScheduleContext): KPISchedulePolicyResult {
    if (request.companyId !== context.companyId) return result("cancel", "company_mismatch")
    if (context.providerKey && request.providerKey && request.providerKey !== context.providerKey) {
      return result("cancel", "provider_mismatch")
    }
    if (context.activeExecutions >= this.config.maxConcurrentExecutions) return result("retry_later", "backpressure",
      this.config.backpressureDelayMs)
    if (request.type === "retry" && context.runtimeStatus === "failed") return result("ignore", "retry")
    if (request.type !== "recovery" && context.recentFailures >= this.config.backpressureFailureThreshold) {
      return result("retry_later", "backpressure", this.config.backpressureDelayMs)
    }
    const elapsed = context.lastCycleAt ? context.now.getTime() - context.lastCycleAt.getTime() : Number.MAX_SAFE_INTEGER
    if (elapsed < this.config.minimumWindowMs) return result("retry_later", request.reason,
      this.config.minimumWindowMs - elapsed)
    if (this.deduplicator.isDuplicate(request)) return result("ignore", "duplicate")
    if (!this.rateLimiter.consume(request)) return result("retry_later", "rate_limit", this.config.rateLimitWindowMs)
    const pressure = this.backpressure.evaluate(request.type === "recovery"
      ? Object.freeze({ ...context, recentFailures: 0 }) : context)
    if (pressure.decision === "reject") return result("cancel", "backpressure")
    if (pressure.decision === "delay") return result("retry_later", "backpressure", pressure.delayMs)
    return result("execute", request.reason)
  }
}
function result(decision: KPISchedulePolicyResult["decision"], reason: KPISchedulePolicyResult["reason"],
  delayMs = 0): KPISchedulePolicyResult { return Object.freeze({ decision, reason, delayMs }) }
