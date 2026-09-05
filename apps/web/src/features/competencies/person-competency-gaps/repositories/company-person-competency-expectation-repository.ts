import type { SupabaseClient } from "@supabase/supabase-js"

import { personCompetencyExpectationRowsSchema } from "../schemas/person-competency-expectation-row-schema"
import type { PersonCompetencyExpectationRow } from "../types/person-competency-gap"

export class CompanyPersonCompetencyExpectationReadError extends Error {
  constructor(readonly code: "read_failed" | "invalid_response") {
    super("Não foi possível carregar as competências da empresa.")
    this.name = "CompanyPersonCompetencyExpectationReadError"
  }
}

export function createCompanyPersonCompetencyExpectationRepository(
  database: SupabaseClient,
) {
  return {
    async findByCompany(
      companyId: string,
    ): Promise<readonly PersonCompetencyExpectationRow[]> {
      let response: Readonly<{ data: unknown; error: unknown }>

      try {
        response = await database.rpc(
          "get_tenant_company_person_competency_expectations_v1",
          { p_company_id: companyId },
        )
      } catch {
        throw new CompanyPersonCompetencyExpectationReadError("read_failed")
      }

      if (response.error) {
        throw new CompanyPersonCompetencyExpectationReadError("read_failed")
      }

      const parsed = personCompetencyExpectationRowsSchema.safeParse(response.data)

      if (!parsed.success) {
        throw new CompanyPersonCompetencyExpectationReadError("invalid_response")
      }

      return parsed.data
    },
  }
}
