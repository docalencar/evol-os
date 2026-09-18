import { getCanonicalCompanyPersonCompetencyCoverages } from "@/features/competencies/person-competency-gaps/queries/get-canonical-company-person-competency-coverages"
import { getManagementPeople } from "@/features/dashboard-read"
import { presentDashboardCompetencyDevelopment } from "@/features/dashboard-read/presenters/dashboard-competency-development-presenter"
import type { DashboardCompetencyIntelligence } from "@/features/dashboard-read/types/dashboard-competency-development"

import {
  calculateDevelopmentDashboardKpis,
} from "./get-development-dashboard-kpis"

import {
  calculateDevelopmentMonthlyEvolution,
} from "./calculate-development-monthly-evolution"

import {
  calculateDevelopmentPlanDistribution,
} from "./calculate-development-plan-distribution"

import type {
  DevelopmentExecutiveDashboard,
} from "../types/development-executive-dashboard"

import {
  getDevelopmentPlanListItems,
} from "./get-development-plan-list-items"

/**
 * The plan list is participant-aware: the D-DB1 boundary decides whether this
 * actor is the subject, current manager, explicit owner or an administrator.
 * Competency intelligence remains a separate administrative capability, so the
 * caller decides before invoking 0124 and `null` means forbidden, never empty.
 */
export async function getDevelopmentExecutiveDashboard(
  companyId: string,
  canReadCompetencyIntelligence: boolean
): Promise<DevelopmentExecutiveDashboard> {
  const [planList, people, competencyCoverages] = await Promise.all([
    getDevelopmentPlanListItems(companyId),
    getManagementPeople(companyId),
    canReadCompetencyIntelligence
      ? getCanonicalCompanyPersonCompetencyCoverages(companyId)
      : Promise.resolve(null),
  ])
  const competencyDevelopment: DashboardCompetencyIntelligence =
    competencyCoverages === null
      ? { status: "forbidden" }
      : {
        status: "ok",
        development: presentDashboardCompetencyDevelopment(
          people.map((person) => ({
            personId: person.id,
            personName: person.full_name,
          })),
          competencyCoverages
        ),
      }

  return {
    planList,

    kpis:
      calculateDevelopmentDashboardKpis(
        planList.plans
      ),

    competencyDevelopment,

    planDistribution:
      calculateDevelopmentPlanDistribution(
        planList.plans
      ),

    monthlyEvolution:
      calculateDevelopmentMonthlyEvolution(
        planList.plans
      ),
  }
}
