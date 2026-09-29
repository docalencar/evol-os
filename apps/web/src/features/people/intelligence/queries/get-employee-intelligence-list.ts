import { getCompanyAssessmentSummaries } from "@/features/assessments"
import { getCanonicalCompanyPersonCompetencyCoverages } from "@/features/competencies/person-competency-gaps/queries/get-canonical-company-person-competency-coverages"
import {
  getManagementCompetencies,
  getManagementDevelopmentPlans,
  getManagementPeople,
} from "@/features/dashboard-read"

import { composeEmployeeIntelligenceList } from "../services/compose-employee-intelligence-list"

export async function getEmployeeIntelligenceList(
  companyId: string
) {
  const [
    employees,
    competencies,
    developmentPlans,
    assessmentSummaries,
    competencyCoverages,
  ] = await Promise.all([
    getManagementPeople(companyId),
    getManagementCompetencies(companyId),
    getManagementDevelopmentPlans(companyId),
    getCompanyAssessmentSummaries(companyId),
    getCanonicalCompanyPersonCompetencyCoverages(companyId),
  ])

  return composeEmployeeIntelligenceList({
    employees,
    competencies,
    developmentPlans,
    assessmentSummaries,
    competencyCoverages,
  })
}
