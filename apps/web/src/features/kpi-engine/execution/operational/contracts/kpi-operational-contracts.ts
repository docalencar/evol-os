import type { KPITriggerReason, KPITriggerRequest, KPITriggerResult, KPIScheduleContext } from "../../scheduler"

export type OperationalEvent = Readonly<{ eventId: string; companyId: string; providerKey?: string
  reason?: KPITriggerReason; priority?: number; occurredAt: Date; metadata?: Readonly<Record<string, string>> }>
export type CronTick = OperationalEvent & Readonly<{ scheduleKey: string }>
export type QueueMessage = OperationalEvent & Readonly<{ queueName: string }>
export type WebhookPayload = OperationalEvent & Readonly<{ source: string }>
export type ApiRequest = OperationalEvent & Readonly<{ actorId: string }>
export interface OperationalAdapter<TEvent extends OperationalEvent = OperationalEvent> {
  adapt(event: TEvent): KPITriggerRequest
}
export interface ManualOperationalAdapter extends OperationalAdapter<OperationalEvent> {
  execute(event: OperationalEvent, context: KPIScheduleContext): Promise<KPITriggerResult>
}
export type CronOperationalAdapter = OperationalAdapter<CronTick>
export type QueueOperationalAdapter = OperationalAdapter<QueueMessage>
export type WebhookOperationalAdapter = OperationalAdapter<WebhookPayload>
export type ApiOperationalAdapter = OperationalAdapter<ApiRequest>
export type OperationalHealth = Readonly<{ status: "healthy" | "degraded" | "unhealthy"
  checkedAt: Date; activeOperations: number; cancelledCompanies: readonly string[] }>
export interface OperationalGateway { schedule(request: KPITriggerRequest,
  context: KPIScheduleContext): Promise<KPITriggerResult>; scheduleMany(requests: readonly KPITriggerRequest[],
  context: KPIScheduleContext): Promise<readonly KPITriggerResult[]>; cancel(companyId: string): Promise<void>
  health(): OperationalHealth; metrics(): Readonly<Record<string, number>> }
export type CoordinatorLease = Readonly<{ leaseId: string; companyId: string; providerKey?: string
  ownerId: string; acquiredAt: Date; expiresAt: Date }>
export type CoordinatorState = Readonly<{ active: number; cancelledCompanies: readonly string[] }>
export interface CoordinatorStore { acquire(lease: CoordinatorLease, limit: number): Promise<boolean>
  release(companyId: string, leaseId: string): Promise<void>; cancel(companyId: string): Promise<void>
  isCancelled(companyId: string): Promise<boolean>; state(): Promise<CoordinatorState> }
export interface OperationalCoordinator { execute<T>(companyId: string, providerKey: string | undefined,
  operation: () => Promise<T>): Promise<T>; cancel(companyId: string): Promise<void>; state(): CoordinatorState }
export type DeduplicationRecord = Readonly<{ triggerHash: string; companyId: string; providerKey?: string
  reason: string; windowStartedAt: Date; windowExpiresAt: Date }>
export interface PersistentDeduplicationStore { reserve(record: DeduplicationRecord): Promise<boolean> }
export type RateLimitRecord = Readonly<{ companyId: string; providerKey?: string; windowStartedAt: Date
  windowExpiresAt: Date; limit: number }>
export interface RateLimitStore { consume(record: RateLimitRecord): Promise<boolean> }
export type OperationalMetricName = "adapterCalls" | "adapterFailures" | "gatewaySchedules" |
  "gatewayCancellations" | "coordinationRejected" | "deduplications" | "rateLimitHits"
export interface OperationalMetrics { increment(name: OperationalMetricName, value?: number): void
  snapshot(): Readonly<Record<string, number>> }
export interface OperationalMetricsExporter { export(metrics: Readonly<Record<string, number>>): string }
export type OperationalTelemetryEvent = Readonly<{ kind: "adapter_called" | "gateway_schedule" |
  "gateway_cancel" | "gateway_health" | "gateway_metrics" | "adapter_failed" |
  "adapter_completed" | "distributed_coordination" | "persistent_rate_limit" |
  "persistent_deduplication"; companyId?: string; providerKey?: string; detail?: string }>
export interface OperationalTelemetry { record(event: OperationalTelemetryEvent): void | Promise<void> }
export interface OperationalDatabase { rpc(name: string, params: Readonly<Record<string, unknown>>):
  PromiseLike<Readonly<{ data: unknown; error: Readonly<{ message: string }> | null }>> }
