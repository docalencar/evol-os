export type DashboardStatus = "healthy" | "attention" | "critical" | "unavailable"
export type DashboardTrend = "up" | "down" | "stable" | "unavailable"
export type DashboardMetricDTO = Readonly<{ id: string; label: string; value: number | null
  unit: "number" | "percent" | "currency"; variation: number | null; trend: DashboardTrend
  status: DashboardStatus; updatedAt: string | null; description: string }>
export type DashboardExecutionDTO = Readonly<{ running: number; succeeded: number; failed: number
  interrupted: number; recoveries: number; retries: number; durationMs: number | null
  throughput: number | null; successRate: number | null }>
export type DashboardPlanningDTO = Readonly<{ currentScenario: string | null; baseScenario: string | null
  financialImpact: number | null; plannedHeadcount: number | null; plannedPayroll: number | null
  affectedDepartments: number | null }>
export type DashboardWorkerDTO = Readonly<{ id: string; runtimeId: string; status: DashboardStatus
  lastCycleAt: string | null; activeLeases: number }>
export type DashboardTimelineDTO = Readonly<{ id: string; kind: "execution" | "recovery" | "lease" |
  "retry" | "cancellation" | "dispatcher" | "scheduler" | "adapter"; occurredAt: string
  title: string; description: string; status: DashboardStatus }>
export type KPIDashboardDTO = Readonly<{ companyName: string; generatedAt: string
  metrics: readonly DashboardMetricDTO[]; execution: DashboardExecutionDTO
  planning: DashboardPlanningDTO; workers: readonly DashboardWorkerDTO[]
  timeline: readonly DashboardTimelineDTO[]; runtimeStatus: DashboardStatus
  schedulerStatus: DashboardStatus; gatewayStatus: DashboardStatus; alerts: readonly string[] }>
export type MetricCardViewModel = Readonly<{ id: string; label: string; valueLabel: string
  variationLabel: string; trendLabel: string; status: DashboardStatus; statusLabel: string
  updatedAtLabel: string; description: string }>
export type KPIDashboardViewModel = Readonly<{ title: string; subtitle: string; generatedAtLabel: string
  isEmpty: boolean; summary: readonly MetricCardViewModel[]; execution: readonly MetricCardViewModel[]
  planning: readonly MetricCardViewModel[]; planningContext: Readonly<{ currentScenario: string
    baseScenario: string }>; health: readonly Readonly<{ label: string
    status: DashboardStatus; statusLabel: string; description: string }>[]
  workers: readonly Readonly<{ id: string; runtimeId: string; status: DashboardStatus
    statusLabel: string; lastCycleLabel: string; activeLeases: number }>[]
  timeline: readonly Readonly<{ id: string; kindLabel: string; occurredAtLabel: string
    title: string; description: string; status: DashboardStatus; statusLabel: string }>[]
  alerts: readonly string[] }>
