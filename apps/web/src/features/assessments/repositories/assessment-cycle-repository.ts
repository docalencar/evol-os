import { createServerDatabase } from "@/lib/database/server-database"

import type {
  AssessmentCycleStatus,
  AssessmentCycleType,
} from "../types/assessment-cycle"

type CreateAssessmentCycleData = {
  companyId: string
  name: string
  description?: string | null
  assessmentType: AssessmentCycleType
  assessmentTemplateId: string
  status: AssessmentCycleStatus
  startDate: string
  endDate: string
  closeDate?: string | null
  allowSelfAssessment: boolean
  allowManagerAssessment: boolean
  allowPeerAssessment: boolean
  allowDirectReportAssessment: boolean
  anonymous: boolean
}

type UpdateAssessmentCycleData = CreateAssessmentCycleData & {
  assessmentCycleId: string
}

export async function createAssessmentCycleRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      return supabase
        .from("assessment_cycles")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("start_date", { ascending: false })
        .order("created_at", { ascending: false })
    },

    async findById(
      companyId: string,
      assessmentCycleId: string
    ) {
      return supabase
        .from("assessment_cycles")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", assessmentCycleId)
        .is("deleted_at", null)
        .single()
    },

    async create(data: CreateAssessmentCycleData) {
      return supabase
        .from("assessment_cycles")
        .insert({
          company_id: data.companyId,
          name: data.name,
          description: data.description ?? null,
          assessment_type: data.assessmentType,
          assessment_template_id:
            data.assessmentTemplateId,
          status: data.status,
          start_date: data.startDate,
          end_date: data.endDate,
          close_date: data.closeDate ?? null,
          allow_self_assessment:
            data.allowSelfAssessment,
          allow_manager_assessment:
            data.allowManagerAssessment,
          allow_peer_assessment:
            data.allowPeerAssessment,
          allow_direct_report_assessment:
            data.allowDirectReportAssessment,
          anonymous: data.anonymous,
        })
    },

    async update(data: UpdateAssessmentCycleData) {
      return supabase
        .from("assessment_cycles")
        .update({
          name: data.name,
          description: data.description ?? null,
          assessment_type: data.assessmentType,
          assessment_template_id:
            data.assessmentTemplateId,
          status: data.status,
          start_date: data.startDate,
          end_date: data.endDate,
          close_date: data.closeDate ?? null,
          allow_self_assessment:
            data.allowSelfAssessment,
          allow_manager_assessment:
            data.allowManagerAssessment,
          allow_peer_assessment:
            data.allowPeerAssessment,
          allow_direct_report_assessment:
            data.allowDirectReportAssessment,
          anonymous: data.anonymous,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", data.companyId)
        .eq("id", data.assessmentCycleId)
        .is("deleted_at", null)
    },

    async archive(
      companyId: string,
      assessmentCycleId: string
    ) {
      return supabase
        .from("assessment_cycles")
        .update({
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", assessmentCycleId)
        .is("deleted_at", null)
    },
  }
}
