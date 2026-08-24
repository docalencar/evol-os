import { createServerDatabase } from "@/lib/database/server-database"

type SaveAssessmentAnswerData = {
  companyId: string
  assessmentResponseId: string
  assessmentQuestionId: string
  answerText?: string | null
  answerNumber?: number | null
  answerBoolean?: boolean | null
  score?: number | null
}

export async function createAssessmentAnswerRepository() {
  const supabase = await createServerDatabase()

  return {
    findAllByResponse(
      companyId: string,
      assessmentResponseId: string
    ) {
      return supabase
        .from("assessment_answers")
        .select("*")
        .eq("company_id", companyId)
        .eq("assessment_response_id", assessmentResponseId)
        .order("created_at", { ascending: true })
    },

    findAllByResponses(
      companyId: string,
      assessmentResponseIds: string[]
    ) {
      if (assessmentResponseIds.length === 0) {
        return Promise.resolve({
          data: [],
          error: null,
        })
      }

      return supabase
        .from("assessment_answers")
        .select("*")
        .eq("company_id", companyId)
        .in(
          "assessment_response_id",
          assessmentResponseIds
        )
        .order("created_at", {
          ascending: true,
        })
    },

    save(data: SaveAssessmentAnswerData) {
      return supabase.rpc(
        "save_tenant_assessment_answer_v1",
        {
          p_company_id: data.companyId,
          p_assessment_response_id: data.assessmentResponseId,
          p_assessment_question_id: data.assessmentQuestionId,
          p_answer_text: data.answerText ?? null,
          p_answer_number: data.answerNumber ?? null,
          p_answer_boolean: data.answerBoolean ?? null,
          p_score: data.score ?? null,
        }
      )
    },
  }
}
