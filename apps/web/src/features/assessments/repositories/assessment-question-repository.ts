import { createServerDatabase } from "@/lib/database/server-database"

import type { AssessmentQuestionType } from "../types/assessment-question"

type CreateAssessmentQuestionData = {
  companyId: string
  assessmentSectionId: string
  competencyId: string | null
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
        .order("id", { ascending: true })
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
      return supabase.rpc("create_tenant_assessment_question_v1", {
        p_company_id: data.companyId,
        p_assessment_section_id: data.assessmentSectionId,
        p_competency_id: data.competencyId,
        p_code: data.code ?? null,
        p_question: data.question,
        p_help_text: data.helpText ?? null,
        p_question_type: data.questionType,
        p_scale_min: data.scaleMin,
        p_scale_max: data.scaleMax,
        p_weight: data.weight,
        p_display_order: data.displayOrder,
        p_required: data.required,
        p_active: data.active,
      })
    },

    update(data: UpdateAssessmentQuestionData) {
      return supabase.rpc("update_tenant_assessment_question_v1", {
        p_company_id: data.companyId,
        p_assessment_question_id: data.assessmentQuestionId,
        p_assessment_section_id: data.assessmentSectionId,
        p_competency_id: data.competencyId,
        p_code: data.code ?? null,
        p_question: data.question,
        p_help_text: data.helpText ?? null,
        p_question_type: data.questionType,
        p_scale_min: data.scaleMin,
        p_scale_max: data.scaleMax,
        p_weight: data.weight,
        p_display_order: data.displayOrder,
        p_required: data.required,
        p_active: data.active,
      })
    },

    archive(
      companyId: string,
      assessmentQuestionId: string
    ) {
      return supabase.rpc("archive_tenant_assessment_question_v1", {
        p_company_id: companyId,
        p_assessment_question_id: assessmentQuestionId,
      })
    },
  }
}
