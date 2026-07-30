import type { KPIWorkerCycleResult, KPIWorkerHealthDTO, KPIWorkerRuntimeStatus } from "../../runtime"

export type KPITriggerType = "manual" | "scheduled" | "retry" | "recovery" | "provider" |
  "company" | "scenario" | "future_event"
export type KPITriggerReason = KPITriggerType | "backpressure" | "rate_limit" | "duplicate" |
  "company_mismatch" | "provider_mismatch" | "disabled"
export type KPITrigger = Readonly<{ id: string; type: KPITriggerType; enabled: boolean
  companyId?: string; providerKey?: string; priority?: number }>
export type KPITriggerRequest = Readonly<{ triggerId: string; type: KPITriggerType; reason: KPITriggerReason
  companyId: string; providerKey?: string; scenarioId?: string; requestedAt: Date
  metadata?: Readonly<Record<string, string>> }>
export type KPITriggerResult = Readonly<{ request: KPITriggerRequest; schedule: KPIScheduleResult }>
export type KPIScheduleDecision = "execute" | "ignore" | "retry_later" | "cancel"
export type KPIBackpressureDecision = "continue" | "delay" | "reject"
export type KPIScheduleContext = Readonly<{ companyId: string; providerKey?: string
  runtimeStatus: KPIWorkerRuntimeStatus; queueSize: number; activeLeases: number; recentFailures: number
  activeExecutions: number; lastCycleAt: Date | null; now: Date }>
export type KPISchedulePolicyResult = Readonly<{ decision: KPIScheduleDecision; reason: KPITriggerReason
  delayMs: number }>
export type KPIScheduleResult = Readonly<{ scheduleId: string; decision: KPIScheduleDecision
  reason: KPITriggerReason; delayMs: number; invoked: boolean; cycle?: KPIWorkerCycleResult }>
export interface KPITriggerPolicy { evaluate(request: KPITriggerRequest,
  context: KPIScheduleContext): KPISchedulePolicyResult }
export type KPISchedulePolicy = KPITriggerPolicy
export interface KPITriggerRegistry { register(trigger: KPITrigger): void; enable(id: string): void
  disable(id: string): void; resolveById(id: string): KPITrigger | null
  resolveByType(type: KPITriggerType): readonly KPITrigger[]
  resolveByProvider(providerKey: string): readonly KPITrigger[]
  resolveByCompany(companyId: string): readonly KPITrigger[]; list(): readonly KPITrigger[] }
export interface KPITriggerScheduler { schedule(request: KPITriggerRequest,
  context: KPIScheduleContext): Promise<KPITriggerResult> }
export interface KPITriggerSource { create(input: Omit<KPITriggerRequest, "type" | "reason">): KPITriggerRequest }
export interface KPIRuntimeInvoker { invoke(decision: KPISchedulePolicyResult): Promise<Readonly<{
  invoked: boolean; cycle?: KPIWorkerCycleResult; health?: KPIWorkerHealthDTO }>> }
export interface KPIBackpressurePolicy { evaluate(context: KPIScheduleContext): Readonly<{
  decision: KPIBackpressureDecision; delayMs: number }> }
export interface KPIRateLimiter { consume(request: KPITriggerRequest): boolean }
export interface KPITriggerDeduplicator { isDuplicate(request: KPITriggerRequest): boolean }
export type KPISchedulerMetricName = "triggersReceived" | "triggersAccepted" | "triggersRejected" |
  "triggersDeduplicated" | "runtimeInvocations" | "backpressureEvents" | "rateLimitEvents" |
  "scheduledExecutions" | "manualExecutions" | "retryExecutions" | "recoveryExecutions"
export interface KPISchedulerMetrics { increment(name: KPISchedulerMetricName, value?: number): void }
export type KPISchedulerTelemetryEvent = Readonly<{ kind: "trigger_received" | "trigger_registered" |
  "trigger_rejected" | "trigger_scheduled" | "trigger_cancelled" | "runtime_invoked" |
  "schedule_backpressure" | "rate_limit_hit" | "trigger_deduplicated" | "scheduler_started" |
  "scheduler_completed"; scheduleId?: string; triggerId?: string; companyId?: string
  providerKey?: string; reason?: string }>
export interface KPISchedulerTelemetry { record(event: KPISchedulerTelemetryEvent): void | Promise<void> }
