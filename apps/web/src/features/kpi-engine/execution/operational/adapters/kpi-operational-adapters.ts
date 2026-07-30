import type { KPITriggerRequest, KPITriggerType } from "../../scheduler"
import type { ApiOperationalAdapter, ApiRequest, CronOperationalAdapter, CronTick,
  ManualOperationalAdapter, OperationalAdapter, OperationalEvent, OperationalGateway,
  OperationalMetrics, OperationalTelemetry, QueueMessage, QueueOperationalAdapter,
  WebhookOperationalAdapter, WebhookPayload } from "../contracts"
import type { KPIScheduleContext } from "../../scheduler"

abstract class BaseOperationalAdapter<T extends OperationalEvent> implements OperationalAdapter<T> {
  constructor(private readonly type: KPITriggerType, protected readonly telemetry?: OperationalTelemetry,
    private readonly metrics?: OperationalMetrics) {}
  adapt(event: T): KPITriggerRequest { this.metrics?.increment("adapterCalls")
    void this.telemetry?.record({ kind: "adapter_called", companyId: event.companyId,
      providerKey: event.providerKey, detail: this.type })
    const request = Object.freeze({ triggerId: event.eventId, type: this.type,
    reason: event.reason ?? this.type, companyId: event.companyId, providerKey: event.providerKey,
    requestedAt: event.occurredAt, metadata: Object.freeze({ ...event.metadata,
      priority: String(event.priority ?? 0) }) })
    void this.telemetry?.record({ kind: "adapter_completed", companyId: event.companyId,
      providerKey: event.providerKey, detail: this.type }); return request }
}
export class DefaultManualOperationalAdapter extends BaseOperationalAdapter<OperationalEvent>
  implements ManualOperationalAdapter {
  constructor(private readonly gateway: OperationalGateway, telemetry?: OperationalTelemetry,
    metrics?: OperationalMetrics) { super("manual", telemetry, metrics) }
  async execute(event: OperationalEvent, context: KPIScheduleContext) {
    try { return await this.gateway.schedule(this.adapt(event), context) } catch (error) {
      await this.telemetry?.record({ kind: "adapter_failed", companyId: event.companyId,
        providerKey: event.providerKey, detail: error instanceof Error ? error.message : "adapter_failed" }); throw error
    }
  }
}
export class DefaultCronOperationalAdapter extends BaseOperationalAdapter<CronTick>
  implements CronOperationalAdapter { constructor(telemetry?: OperationalTelemetry, metrics?: OperationalMetrics) {
    super("scheduled", telemetry, metrics) } }
export class DefaultQueueOperationalAdapter extends BaseOperationalAdapter<QueueMessage>
  implements QueueOperationalAdapter { constructor(telemetry?: OperationalTelemetry, metrics?: OperationalMetrics) {
    super("future_event", telemetry, metrics) } }
export class DefaultWebhookOperationalAdapter extends BaseOperationalAdapter<WebhookPayload>
  implements WebhookOperationalAdapter { constructor(telemetry?: OperationalTelemetry, metrics?: OperationalMetrics) {
    super("future_event", telemetry, metrics) } }
export class DefaultApiOperationalAdapter extends BaseOperationalAdapter<ApiRequest>
  implements ApiOperationalAdapter { constructor(telemetry?: OperationalTelemetry, metrics?: OperationalMetrics) {
    super("manual", telemetry, metrics) } }
