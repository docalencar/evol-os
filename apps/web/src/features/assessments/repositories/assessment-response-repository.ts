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

    findByEmployee(
      companyId: string,
      employeeId: string
    ) {
      return supabase
        .from("assessment_responses")
        .select("*")
        .eq("company_id", companyId)
        .eq("employee_id", employeeId)
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

    generateForCycle(
      companyId: string,
      assessmentCycleId: string
    ) {
      return supabase.rpc("generate_tenant_assessment_cycle_responses_v1", {
        p_company_id: companyId,
        p_assessment_cycle_id: assessmentCycleId,
      })
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
