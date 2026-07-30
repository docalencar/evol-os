import type { PlanningKPIProvider } from "../contracts"
import { HeadcountProvider, OrganizationProvider, PayrollProvider, ScenarioProvider, VacancyProvider } from "../providers"

export function createPlanningKPIProviders(): readonly PlanningKPIProvider[] {
  return Object.freeze([new HeadcountProvider(), new VacancyProvider(), new PayrollProvider(), new OrganizationProvider(), new ScenarioProvider()])
}
