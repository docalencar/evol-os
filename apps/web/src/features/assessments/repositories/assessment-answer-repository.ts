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

    save(data: SaveAssessmentAnswerData) {
      return supabase
        .from("assessment_answers")
        .upsert(
          {
            company_id: data.companyId,
            assessment_response_id:
              data.assessmentResponseId,
            assessment_question_id:
              data.assessmentQuestionId,
            answer_text: data.answerText ?? null,
            answer_number: data.answerNumber ?? null,
            answer_boolean: data.answerBoolean ?? null,
            score: data.score ?? null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict:
              "assessment_response_id,assessment_question_id",
          }
        )
        .select("*")
        .single()
    },
  }
}
