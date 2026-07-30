import type { KPIDefinition, KPIDefinitionVersion } from "../../../kpi-engine"
import type { PlanningKPIProvider, PlanningKPISource } from "../contracts"
import { PLANNING_KPI_KEYS, valueFor } from "../providers"

const OFFICIAL_KPIS = Object.freeze([
  [PLANNING_KPI_KEYS.headcount, "Headcount", "number", "increase"],
  [PLANNING_KPI_KEYS.approvedHeadcount, "Approved Headcount", "number", "increase"],
  [PLANNING_KPI_KEYS.plannedHeadcount, "Planned Headcount", "number", "increase"],
  [PLANNING_KPI_KEYS.vacancies, "Vacancies", "number", "decrease"],
  [PLANNING_KPI_KEYS.occupancyRate, "Occupancy Rate", "percentage", "increase"],
  [PLANNING_KPI_KEYS.departments, "Departments", "number", "neutral"],
  [PLANNING_KPI_KEYS.teams, "Teams", "number", "neutral"],
  [PLANNING_KPI_KEYS.positions, "Positions", "number", "neutral"],
  [PLANNING_KPI_KEYS.spanOfControl, "Span of Control", "ratio", "neutral"],
  [PLANNING_KPI_KEYS.organizationalLayers, "Organizational Layers", "number", "decrease"],
  [PLANNING_KPI_KEYS.currentPayroll, "Current Payroll", "currency", "decrease"],
  [PLANNING_KPI_KEYS.plannedPayroll, "Planned Payroll", "currency", "decrease"],
  [PLANNING_KPI_KEYS.payrollVariation, "Payroll Variation", "percentage", "decrease"],
  [PLANNING_KPI_KEYS.scenarioImpact, "Scenario Impact", "number", "neutral"],
] as const)

export function createPlanningKPIDefinitions(providers: readonly PlanningKPIProvider[], effectiveFrom: Date): readonly KPIDefinitionVersion[] {
  return Object.freeze(OFFICIAL_KPIS.map(([key, name, valueKind, favorableDirection]) => {
    const provider = providers.find((candidate) => candidate.keys.includes(key))
    if (!provider) throw new Error(`PLANNING_KPI_PROVIDER_NOT_FOUND:${key}`)
    const definition: KPIDefinition<PlanningKPISource> = Object.freeze({
      id: key, key, name,
      description: `${name} projetado pelo Organization Planning.`,
      ownerModule: "organization-planning", category: "planning", valueKind,
      unit: valueKind === "currency" ? "BRL" : null,
      precision: valueKind === "number" ? 0 : 2,
      favorableDirection,
      calculate: (source) => valueFor(provider.calculate(source), key),
    })
    return Object.freeze({ definitionId: key, key, version: 1, effectiveFrom,
      effectiveUntil: null, active: true, definition })
  }))
}
