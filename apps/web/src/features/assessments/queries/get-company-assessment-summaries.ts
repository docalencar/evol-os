import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import {
  createCompanyAssessmentSummaryRepository,
  type CompanyAssessmentSummary,
} from "../repositories/company-assessment-summary-repository"

export type { CompanyAssessmentSummary }

export async function getCompanyAssessmentSummaries(
  companyId: string
): Promise<readonly CompanyAssessmentSummary[]> {
  const database = await createServerDatabase()
  return createCompanyAssessmentSummaryRepository(database)
    .findByCompany(companyId)
}
