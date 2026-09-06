import { createPersonCompetencyExpectationRepository } from "../repositories/person-competency-expectation-repository"
import { deriveCanonicalPersonCompetencyCoverage } from "../services/derive-canonical-person-competency-coverage"
import type { CanonicalPersonCompetencyCoverage } from "../types/person-competency-gap"

/**
 * The 0123 boundary refused this read.
 *
 * `get_tenant_person_competency_expectations_v1` raises `42501` with one constant
 * message for every refusal it can make — target in another tenant, target that
 * exists nowhere, actor without an administrative role reading someone else. That
 * single answer is deliberate: it is what stops the endpoint from confirming
 * which person ids are real.
 *
 * Distinguishing this from an infrastructure failure matters because the two
 * deserve opposite handling. A denial is a *known* answer the caller can route on
 * — the person page redirects to the list. An unreadable database is not an
 * answer at all and must keep propagating.
 */
export class PersonCompetencyExpectationsDeniedError extends Error {
  constructor() {
    super("PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN")
    this.name = "PersonCompetencyExpectationsDeniedError"
  }
}

/** The read failed for a reason that is not a domain denial. */
export class PersonCompetencyCoverageUnavailableError extends Error {
  constructor() {
    super("Não foi possível carregar as competências desta pessoa.")
    this.name = "PersonCompetencyCoverageUnavailableError"
  }
}

/** PostgREST surfaces the SQLSTATE verbatim; `42501` is insufficient_privilege. */
function isDomainDenial(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const code = (error as { code?: unknown }).code
  return code === "42501"
}

/**
 * Canonical competency coverage for one person, within one tenant.
 *
 * Callers must have already established that `personId` belongs to `companyId`.
 * The person page does this in its phase-1 identity gate, and that ordering is
 * the real fix for the cross-tenant crash this classification backs up: reaching
 * a denial here at all now means a *role* denial, not a tenant one.
 *
 * Coverage is never fabricated on refusal. `CanonicalPersonCompetencyCoverage`
 * carries an `assignmentState`, so returning an empty object would assert a
 * position/profile state the database never confirmed — the surface would lie.
 * Both failure modes therefore throw; only their type differs.
 */
export async function getCanonicalPersonCompetencyCoverage(
  companyId: string,
  personId: string
): Promise<CanonicalPersonCompetencyCoverage> {
  const repository = await createPersonCompetencyExpectationRepository()
  const result = await repository.findByPerson(companyId, personId)

  if (result.error) {
    if (isDomainDenial(result.error)) {
      throw new PersonCompetencyExpectationsDeniedError()
    }
    // Schema-parse failures and transport errors land here. They are not denials
    // and must not be reported as one.
    throw new PersonCompetencyCoverageUnavailableError()
  }

  return deriveCanonicalPersonCompetencyCoverage(result.data ?? [])
}
