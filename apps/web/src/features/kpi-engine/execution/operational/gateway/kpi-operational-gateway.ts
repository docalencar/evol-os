import type { Clock } from "../../.."
import type { KPITriggerRequest, KPITriggerResult, KPITriggerScheduler, KPIScheduleContext } from "../../scheduler"
import type { OperationalCoordinator, OperationalGateway, OperationalHealth,
  OperationalMetrics, OperationalTelemetry } from "../contracts"

export class DefaultOperationalGateway implements OperationalGateway {
  constructor(private readonly scheduler: KPITriggerScheduler, private readonly coordinator: OperationalCoordinator,
    private readonly clock: Clock, private readonly operationalMetrics: OperationalMetrics,
    private readonly telemetry: OperationalTelemetry) {}
  async schedule(request: KPITriggerRequest, context: KPIScheduleContext): Promise<KPITriggerResult> {
    this.operationalMetrics.increment("gatewaySchedules"); await this.emit("gateway_schedule", request)
    return this.coordinator.execute(request.companyId, request.providerKey,
      () => this.scheduler.schedule(request, context))
  }
  async scheduleMany(requests: readonly KPITriggerRequest[], context: KPIScheduleContext) {
    const results: KPITriggerResult[] = []
    for (const request of requests) results.push(await this.schedule(request, context))
    return Object.freeze(results)
  }
  async cancel(companyId: string): Promise<void> { this.operationalMetrics.increment("gatewayCancellations")
    await this.coordinator.cancel(companyId); await this.telemetry.record({ kind: "gateway_cancel", companyId }) }
  health(): OperationalHealth { const state = this.coordinator.state(); void this.telemetry.record({ kind: "gateway_health" })
    return Object.freeze({ status: state.active > 0 ? "degraded" : "healthy", checkedAt: this.clock.now(),
      activeOperations: state.active, cancelledCompanies: state.cancelledCompanies }) }
  metrics(): Readonly<Record<string, number>> { void this.telemetry.record({ kind: "gateway_metrics" })
    return this.operationalMetrics.snapshot() }
  private async emit(kind: "gateway_schedule", request: KPITriggerRequest): Promise<void> {
    await this.telemetry.record({ kind, companyId: request.companyId, providerKey: request.providerKey })
  }
}
