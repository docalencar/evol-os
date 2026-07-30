import type { DashboardMetricDTO, DashboardStatus, KPIDashboardDTO,
  KPIDashboardViewModel, MetricCardViewModel } from "../types"

const statusLabels: Readonly<Record<DashboardStatus, string>> = Object.freeze({ healthy: "Saudável",
  attention: "Atenção", critical: "Crítico", unavailable: "Indisponível" })
export class KPIDashboardPresenter {
  present(dto: KPIDashboardDTO): KPIDashboardViewModel {
    const execution = dto.execution
    const executionMetrics: DashboardMetricDTO[] = [metric("running", "Em execução", execution.running),
      metric("succeeded", "Concluídas", execution.succeeded), metric("failed", "Falhas", execution.failed,
        execution.failed > 0 ? "critical" : "healthy"), metric("interrupted", "Interrompidas", execution.interrupted),
      metric("recovery", "Recoveries", execution.recoveries), metric("retry", "Retries", execution.retries),
      metric("duration", "Duração média", execution.durationMs, "unavailable", "number", "Milissegundos por execução"),
      metric("throughput", "Throughput", execution.throughput, "unavailable", "number", "Execuções por janela"),
      metric("success-rate", "Taxa de sucesso", execution.successRate, "unavailable", "percent")]
    const planningMetrics: DashboardMetricDTO[] = [metric("financial-impact", "Impacto financeiro",
      dto.planning.financialImpact, "unavailable", "currency"), metric("planned-headcount", "Headcount planejado",
      dto.planning.plannedHeadcount), metric("planned-payroll", "Payroll planejado", dto.planning.plannedPayroll,
      "unavailable", "currency"), metric("affected-departments", "Departamentos afetados",
      dto.planning.affectedDepartments)]
    return Object.freeze({ title: "Executive Dashboard", subtitle: `Visão consolidada de ${dto.companyName}`,
      generatedAtLabel: formatDate(dto.generatedAt), isEmpty: dto.metrics.every((item) => item.value === null),
      summary: Object.freeze(dto.metrics.map(presentMetric)),
      execution: Object.freeze(executionMetrics.map(presentMetric)),
      planning: Object.freeze(planningMetrics.map(presentMetric)),
      planningContext: Object.freeze({ currentScenario: dto.planning.currentScenario ?? "Indisponível",
        baseScenario: dto.planning.baseScenario ?? "Indisponível" }),
      health: Object.freeze([{ label: "Runtime", status: dto.runtimeStatus,
        statusLabel: statusLabels[dto.runtimeStatus], description: "Saúde do Worker Runtime" },
      { label: "Scheduler", status: dto.schedulerStatus, statusLabel: statusLabels[dto.schedulerStatus],
        description: "Disponibilidade do Scheduler" }, { label: "Operational Gateway", status: dto.gatewayStatus,
        statusLabel: statusLabels[dto.gatewayStatus], description: "Entrada operacional" },
      countHealth("Workers ativos", dto.workers.filter((worker) => worker.status === "healthy").length),
      countHealth("Executions Running", dto.execution.running), countHealth("Retries", dto.execution.retries),
      countHealth("Recoveries", dto.execution.recoveries), countHealth("Failed Executions", dto.execution.failed,
        dto.execution.failed > 0 ? "critical" : "healthy")]),
      workers: Object.freeze(dto.workers.map((worker) => Object.freeze({ ...worker,
        statusLabel: statusLabels[worker.status], lastCycleLabel: formatOptionalDate(worker.lastCycleAt) }))),
      timeline: Object.freeze([...dto.timeline].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
        .map((item) => Object.freeze({ ...item, kindLabel: timelineLabel(item.kind),
          occurredAtLabel: formatDate(item.occurredAt), statusLabel: statusLabels[item.status] }))),
      alerts: Object.freeze([...dto.alerts]) })
  }
}
function countHealth(label: string, value: number, status: DashboardStatus = "healthy") {
  return Object.freeze({ label, status, statusLabel: statusLabels[status], description: String(value) })
}
function metric(id: string, label: string, value: number | null, status: DashboardStatus = "healthy",
  unit: DashboardMetricDTO["unit"] = "number", description = label): DashboardMetricDTO {
  return Object.freeze({ id, label, value, unit, variation: null, trend: "unavailable", status: value === null
    ? "unavailable" : status, updatedAt: null, description })
}
function presentMetric(item: DashboardMetricDTO): MetricCardViewModel { return Object.freeze({ id: item.id,
  label: item.label, valueLabel: formatValue(item.value, item.unit), variationLabel: item.variation === null
    ? "Sem comparação" : `${item.variation > 0 ? "+" : ""}${formatNumber(item.variation)}%`,
  trendLabel: item.trend === "up" ? "Em alta" : item.trend === "down" ? "Em queda" :
    item.trend === "stable" ? "Estável" : "Sem tendência", status: item.status,
  statusLabel: statusLabels[item.status], updatedAtLabel: formatOptionalDate(item.updatedAt),
  description: item.description }) }
function formatValue(value: number | null, unit: DashboardMetricDTO["unit"]): string {
  if (value === null) return "—"
  if (unit === "currency") return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL",
    maximumFractionDigits: 0 }).format(value)
  return `${formatNumber(value)}${unit === "percent" ? "%" : ""}`
}
function formatNumber(value: number): string { return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value) }
function formatDate(value: string): string { return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short",
  timeStyle: "short", timeZone: "America/Fortaleza" }).format(new Date(value)) }
function formatOptionalDate(value: string | null): string { return value ? formatDate(value) : "Sem atualização" }
function timelineLabel(kind: KPIDashboardDTO["timeline"][number]["kind"]): string {
  return ({ execution: "Execução", recovery: "Recovery", lease: "Lease", retry: "Retry",
    cancellation: "Cancelamento", dispatcher: "Dispatcher", scheduler: "Scheduler",
    adapter: "Adapter" } as const)[kind]
}
