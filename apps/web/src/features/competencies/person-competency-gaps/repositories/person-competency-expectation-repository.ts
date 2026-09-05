import { createServerDatabase } from "@/lib/database/server-database"

import { personCompetencyExpectationRowsSchema } from "../schemas/person-competency-expectation-row-schema"

export async function createPersonCompetencyExpectationRepository() {
  const database = await createServerDatabase()

  return {
    async findByPerson(companyId: string, personId: string) {
      const { data, error } = await database.rpc(
        "get_tenant_person_competency_expectations_v1",
        {
          p_company_id: companyId,
          p_person_id: personId,
        }
      )

      if (error) {
        return { data: null, error }
      }

      const parsed = personCompetencyExpectationRowsSchema.safeParse(data)

      if (!parsed.success) {
        return { data: null, error: parsed.error }
      }

      return { data: parsed.data, error: null }
    },
  }
}
