import "server-only"

import { getExecutiveOverview } from "@/features/executive"
import { SystemClock } from "@/features/kpi-engine"

import { KPIDashboardApplicationService } from "../application"
import { KPIDashboardPresenter } from "../presenters"
import type { DashboardMetricDTO, KPIDashboardDTO } from "../types"
import { KPIDashboardQueryService, type KPIDashboardSource } from "./kpi-dashboard-query-service"

class ExecutiveOverviewDashboardSource implements KPIDashboardSource {
  constructor(private readonly clock: SystemClock) {}
  async load(): Promise<KPIDashboardDTO> {
    const overview = await getExecutiveOverview(); const generatedAt = this.clock.now().toISOString()
    return Object.freeze({ companyName: "empresa atual", generatedAt,
      metrics: Object.freeze([availableMetric("total-employees", "Total Employees", overview.totalEmployees,
        generatedAt, "Colaboradores ativos na organização"), unavailableMetric("approved-headcount", "Approved Headcount"),
      unavailableMetric("vacancies", "Vacancies"), unavailableMetric("occupancy", "Occupancy", "percent"),
      unavailableMetric("payroll", "Payroll", "currency"), unavailableMetric("payroll-variation", "Payroll Variation", "percent"),
      unavailableMetric("organization-layers", "Organization Layers"), unavailableMetric("span-of-control", "Span of Control"),
      unavailableMetric("scenario-impact", "Scenario Impact")]),
      execution: Object.freeze({ running: 0, succeeded: 0, failed: 0, interrupted: 0,
        recoveries: 0, retries: 0, durationMs: null, throughput: null, successRate: null }),
      planning: Object.freeze({ currentScenario: null, baseScenario: null, financialImpact: null,
        plannedHeadcount: null, plannedPayroll: null, affectedDepartments: null }), workers: Object.freeze([]),
      timeline: Object.freeze([]), runtimeStatus: "unavailable", schedulerStatus: "unavailable",
      gatewayStatus: "unavailable", alerts: Object.freeze(overview.criticalEmployees > 0
        ? [`${overview.criticalEmployees} colaborador(es) em condição crítica.`] : []) })
  }
}
export async function getExecutiveKPIDashboard() {
  const clock = new SystemClock(); return new KPIDashboardApplicationService(
    new KPIDashboardQueryService(new ExecutiveOverviewDashboardSource(clock)),
    new KPIDashboardPresenter()).execute()
}
function availableMetric(id: string, label: string, value: number, updatedAt: string,
  description: string): DashboardMetricDTO { return Object.freeze({ id, label, value, unit: "number",
  variation: null, trend: "unavailable", status: "healthy", updatedAt, description }) }
function unavailableMetric(id: string, label: string, unit: DashboardMetricDTO["unit"] = "number"):
  DashboardMetricDTO { return Object.freeze({ id, label, value: null, unit, variation: null,
  trend: "unavailable", status: "unavailable", updatedAt: null, description: "Aguardando avaliação do KPI Engine" }) }
