import type { IdGenerator } from "../../.."
import type { KPIRuntimeInvoker, KPIScheduleContext, KPISchedulePolicy,
  KPISchedulerMetrics, KPISchedulerTelemetry, KPITriggerRegistry, KPITriggerRequest,
  KPITriggerResult, KPITriggerScheduler } from "../contracts"

export class DefaultKPITriggerScheduler implements KPITriggerScheduler {
  constructor(private readonly registry: KPITriggerRegistry, private readonly policy: KPISchedulePolicy,
    private readonly invoker: KPIRuntimeInvoker, private readonly metrics: KPISchedulerMetrics,
    private readonly telemetry: KPISchedulerTelemetry, private readonly ids: IdGenerator) {}
  async schedule(request: KPITriggerRequest, context: KPIScheduleContext): Promise<KPITriggerResult> {
    const scheduleId = this.ids.generate(); this.metrics.increment("triggersReceived")
    await this.emit("trigger_received", request, scheduleId); await this.emit("scheduler_started", request, scheduleId)
    const trigger = this.registry.resolveById(request.triggerId)
    const decision = !trigger || !trigger.enabled ? Object.freeze({ decision: "ignore" as const,
      reason: "disabled" as const, delayMs: 0 }) : this.policy.evaluate(request, context)
    this.recordDecision(request, decision.decision, decision.reason)
    if (decision.decision === "execute") await this.emit("trigger_scheduled", request, scheduleId)
    else await this.emit(decision.decision === "cancel" ? "trigger_cancelled" : "trigger_rejected",
      request, scheduleId, decision.reason)
    if (decision.reason === "duplicate") await this.emit("trigger_deduplicated", request, scheduleId)
    if (decision.reason === "rate_limit") await this.emit("rate_limit_hit", request, scheduleId)
    if (decision.reason === "backpressure") await this.emit("schedule_backpressure", request, scheduleId)
    const invocation = await this.invoker.invoke(decision)
    if (invocation.invoked) { this.metrics.increment("runtimeInvocations");
      await this.emit("runtime_invoked", request, scheduleId) }
    const schedule = Object.freeze({ scheduleId, ...decision, invoked: invocation.invoked,
      cycle: invocation.cycle })
    await this.emit("scheduler_completed", request, scheduleId, decision.reason)
    return Object.freeze({ request, schedule })
  }
  private recordDecision(request: KPITriggerRequest, decision: string, reason: string): void {
    if (decision === "execute") { this.metrics.increment("triggersAccepted")
      this.metrics.increment("scheduledExecutions")
      if (request.type === "manual") this.metrics.increment("manualExecutions")
      if (request.type === "retry") this.metrics.increment("retryExecutions")
      if (request.type === "recovery") this.metrics.increment("recoveryExecutions")
    } else this.metrics.increment("triggersRejected")
    if (reason === "duplicate") this.metrics.increment("triggersDeduplicated")
    if (reason === "backpressure") this.metrics.increment("backpressureEvents")
    if (reason === "rate_limit") this.metrics.increment("rateLimitEvents")
  }
  private async emit(kind: Parameters<KPISchedulerTelemetry["record"]>[0]["kind"],
    request: KPITriggerRequest, scheduleId: string, reason?: string): Promise<void> {
    await this.telemetry.record(Object.freeze({ kind, scheduleId, triggerId: request.triggerId,
      companyId: request.companyId, providerKey: request.providerKey, reason }))
  }
}
