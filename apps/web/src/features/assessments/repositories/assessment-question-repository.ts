import { createServerDatabase } from "@/lib/database/server-database"

import type { AssessmentQuestionType } from "../types/assessment-question"

type CreateAssessmentQuestionData = {
  companyId: string
  assessmentSectionId: string
  code?: string | null
  question: string
  helpText?: string | null
  questionType: AssessmentQuestionType
  scaleMin: number
  scaleMax: number
  weight: number
  displayOrder: number
  required: boolean
  active: boolean
}

type UpdateAssessmentQuestionData =
  CreateAssessmentQuestionData & {
    assessmentQuestionId: string
  }

export async function createAssessmentQuestionRepository() {
  const supabase = await createServerDatabase()

  return {
    findAllBySection(
      companyId: string,
      assessmentSectionId: string
    ) {
      return supabase
        .from("assessment_questions")
        .select("*")
        .eq("company_id", companyId)
        .eq("assessment_section_id", assessmentSectionId)
        .is("deleted_at", null)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true })
    },

    findById(
      companyId: string,
      assessmentQuestionId: string
    ) {
      return supabase
        .from("assessment_questions")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", assessmentQuestionId)
        .is("deleted_at", null)
        .single()
    },

    create(data: CreateAssessmentQuestionData) {
      return supabase.from("assessment_questions").insert({
        company_id: data.companyId,
        assessment_section_id: data.assessmentSectionId,
        code: data.code ?? null,
        question: data.question,
        help_text: data.helpText ?? null,
        question_type: data.questionType,
        scale_min: data.scaleMin,
        scale_max: data.scaleMax,
        weight: data.weight,
        display_order: data.displayOrder,
        required: data.required,
        active: data.active,
      })
    },

    update(data: UpdateAssessmentQuestionData) {
      return supabase
        .from("assessment_questions")
        .update({
          assessment_section_id: data.assessmentSectionId,
          code: data.code ?? null,
          question: data.question,
          help_text: data.helpText ?? null,
          question_type: data.questionType,
          scale_min: data.scaleMin,
          scale_max: data.scaleMax,
          weight: data.weight,
          display_order: data.displayOrder,
          required: data.required,
          active: data.active,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", data.companyId)
        .eq("id", data.assessmentQuestionId)
        .is("deleted_at", null)
    },

    archive(
      companyId: string,
      assessmentQuestionId: string
    ) {
      return supabase
        .from("assessment_questions")
        .update({
          active: false,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", assessmentQuestionId)
        .is("deleted_at", null)
    },
  }
}
