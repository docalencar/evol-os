import { createServerDatabase } from "@/lib/database/server-database"

import type { AssessmentResponseStatus } from "../types/assessment-response"

type CreateAssessmentResponseData = {
  companyId: string
  assessmentCycleId: string
  assessmentTemplateId: string
  employeeId: string
  evaluatorId: string
}

export async function createAssessmentResponseRepository() {
  const supabase = await createServerDatabase()

  return {
    findById(
      companyId: string,
      assessmentResponseId: string
    ) {
      return supabase
        .from("assessment_responses")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", assessmentResponseId)
        .single()
    },

    findByEvaluator(
      companyId: string,
      evaluatorId: string
    ) {
      return supabase
        .from("assessment_responses")
        .select("*")
        .eq("company_id", companyId)
        .eq("evaluator_id", evaluatorId)
        .order("created_at", { ascending: false })
    },

    findByCycle(
      companyId: string,
      assessmentCycleId: string
    ) {
      return supabase
        .from("assessment_responses")
        .select(`
          *,
          employee:people!assessment_responses_employee_id_fkey(
            id,
            full_name,
            email
          ),
          evaluator:people!assessment_responses_evaluator_id_fkey(
            id,
            full_name
          )
        `)
        .eq("company_id", companyId)
        .eq("assessment_cycle_id", assessmentCycleId)
        .order("created_at", { ascending: true })
    },

    generateSelfAssessments(
      companyId: string,
      assessmentCycleId: string,
      assessmentTemplateId: string,
      employeeIds: string[]
    ) {
      const now = new Date().toISOString()

      return supabase
        .from("assessment_responses")
        .upsert(
          employeeIds.map((employeeId) => ({
            company_id: companyId,
            assessment_cycle_id: assessmentCycleId,
            assessment_template_id: assessmentTemplateId,
            employee_id: employeeId,
            evaluator_id: employeeId,
            status: "draft",
            started_at: null,
            submitted_at: null,
            completed_at: null,
            updated_at: now,
          })),
          {
            onConflict:
              "assessment_cycle_id,assessment_template_id,employee_id,evaluator_id",
            ignoreDuplicates: true,
          }
        )
    },

    create(data: CreateAssessmentResponseData) {
      const now = new Date().toISOString()

      return supabase
        .from("assessment_responses")
        .insert({
          company_id: data.companyId,
          assessment_cycle_id: data.assessmentCycleId,
          assessment_template_id: data.assessmentTemplateId,
          employee_id: data.employeeId,
          evaluator_id: data.evaluatorId,
          status: "in_progress",
          started_at: now,
          updated_at: now,
        })
        .select("*")
        .single()
    },

    updateStatus(
      companyId: string,
      assessmentResponseId: string,
      status: AssessmentResponseStatus
    ) {
      const now = new Date().toISOString()

      return supabase
        .from("assessment_responses")
        .update({
          status,
          submitted_at:
            status === "submitted" ? now : undefined,
          completed_at:
            status === "completed" ? now : undefined,
          updated_at: now,
        })
        .eq("company_id", companyId)
        .eq("id", assessmentResponseId)
        .select("*")
        .single()
    },
  }
}
