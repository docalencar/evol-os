export type AssessmentAnswer = {
  id: string
  company_id: string
  assessment_response_id: string
  assessment_question_id: string
  answer_text: string | null
  answer_number: number | null
  answer_boolean: boolean | null
  score: number | null
  created_at: string
  updated_at: string
}
