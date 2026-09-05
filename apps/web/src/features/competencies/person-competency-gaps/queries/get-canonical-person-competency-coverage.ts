import { createPersonCompetencyExpectationRepository } from "../repositories/person-competency-expectation-repository"
import { deriveCanonicalPersonCompetencyCoverage } from "../services/derive-canonical-person-competency-coverage"
import type { CanonicalPersonCompetencyCoverage } from "../types/person-competency-gap"

export async function getCanonicalPersonCompetencyCoverage(
  companyId: string,
  personId: string
): Promise<CanonicalPersonCompetencyCoverage> {
  const repository = await createPersonCompetencyExpectationRepository()
  const result = await repository.findByPerson(companyId, personId)

  if (result.error) {
    throw new Error("Não foi possível carregar as competências desta pessoa.")
  }

  return deriveCanonicalPersonCompetencyCoverage(result.data ?? [])
}
