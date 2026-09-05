import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import { createCompanyPersonCompetencyExpectationRepository } from "../repositories/company-person-competency-expectation-repository"
import { deriveCanonicalCompanyPersonCompetencyCoverages } from "../services/derive-canonical-company-person-competency-coverages"
import type { CanonicalPersonCompetencyCoverage } from "../types/person-competency-gap"

export async function getCanonicalCompanyPersonCompetencyCoverages(
  companyId: string,
): Promise<readonly CanonicalPersonCompetencyCoverage[]> {
  const database = await createServerDatabase()
  const repository = createCompanyPersonCompetencyExpectationRepository(database)
  const rows = await repository.findByCompany(companyId)

  return deriveCanonicalCompanyPersonCompetencyCoverages(rows)
}
