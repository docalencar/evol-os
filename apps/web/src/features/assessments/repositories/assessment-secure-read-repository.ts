import "server-only"

import type {
  AdministrativeReadGateway,
  AdministrativeReadRequest,
} from "@/features/authorization"
import { createServerDatabase } from "@/lib/database/server-database"

import type {
  AssessmentAdministrativeRead,
  AssessmentEvaluateeResult,
} from "../types/assessment-secure-read"

export async function createAssessmentAdministrativeReadGateway(): Promise<
  AdministrativeReadGateway<AssessmentAdministrativeRead>
> {
  const database = await createServerDatabase()

  return {
    async read(request: AdministrativeReadRequest) {
      const { data, error } = await database.rpc(
        "read_assessment_administratively",
        {
          p_company_id: request.companyId,
          p_scope: request.scope,
          p_scope_id: request.scopeId,
          p_reason: request.reason,
        }
      )

      if (error) {
        throw new Error(error.message)
      }

      return data as AssessmentAdministrativeRead
    },
  }
}

export async function readAssessmentResultForEvaluatee(
  companyId: string,
  assessmentResponseId: string
): Promise<AssessmentEvaluateeResult> {
  const database = await createServerDatabase()
  const { data, error } = await database.rpc(
    "read_assessment_result_for_evaluatee",
    {
      p_company_id: companyId,
      p_assessment_response_id: assessmentResponseId,
    }
  )

  if (error) {
    throw new Error(error.message)
  }

  return data as AssessmentEvaluateeResult
}
