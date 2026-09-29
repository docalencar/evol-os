import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

const companyAssessmentSummaryRowSchema = z.object({
  employee_id: z.string().uuid(),
  completed_assessments: z.number().int().nonnegative(),
  pending_assessments: z.number().int().nonnegative(),
  latest_completed_at: z.string().datetime({ offset: true }).nullable(),
}).strict()

export type CompanyAssessmentSummary = Readonly<{
  employeeId: string
  completedAssessments: number
  pendingAssessments: number
  latestCompletedAt: string | null
}>

export class CompanyAssessmentSummaryReadError extends Error {
  constructor(readonly code: "read_failed" | "invalid_response") {
    super("Não foi possível carregar o resumo de avaliações da empresa.")
    this.name = "CompanyAssessmentSummaryReadError"
  }
}

export function createCompanyAssessmentSummaryRepository(
  database: SupabaseClient
) {
  return {
    async findByCompany(
      companyId: string
    ): Promise<readonly CompanyAssessmentSummary[]> {
      let response: Readonly<{ data: unknown; error: unknown }>

      try {
        response = await database.rpc(
          "get_company_assessment_summary_v1",
          {
            p_company_id: companyId,
            p_reason: "employee_intelligence_list",
          }
        )
      } catch {
        throw new CompanyAssessmentSummaryReadError("read_failed")
      }

      if (response.error) {
        throw new CompanyAssessmentSummaryReadError("read_failed")
      }

      const parsed = z.array(companyAssessmentSummaryRowSchema).safeParse(
        response.data
      )
      if (!parsed.success) {
        throw new CompanyAssessmentSummaryReadError("invalid_response")
      }

      return parsed.data.map((row) => ({
        employeeId: row.employee_id,
        completedAssessments: row.completed_assessments,
        pendingAssessments: row.pending_assessments,
        latestCompletedAt: row.latest_completed_at,
      }))
    },
  }
}
