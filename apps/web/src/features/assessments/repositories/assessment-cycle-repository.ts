import { createServerDatabase } from "@/lib/database/server-database"
import { intentKey } from "@/features/people-organization-mutations"

import type {
  AssessmentCycleStatus,
  AssessmentCycleType,
  AssessmentVisibility,
} from "../types/assessment-cycle"

type CreateAssessmentCycleData = {
  submissionId: string
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
  assessmentVisibility: AssessmentVisibility
}

type UpdateAssessmentCycleData = Omit<CreateAssessmentCycleData, "submissionId"> & {
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

    /**
     * The cycles behind a known set of ids.
     *
     * Exists so an evaluator who is not an administrator can be told WHICH
     * assessment is waiting for them. The caller passes only the cycles its own
     * open responses point at, so the result is already narrower than the
     * "members can read assessment cycles" policy (0021) would allow — this
     * method widens nothing, and the policy remains the boundary.
     */
    async findByIds(companyId: string, assessmentCycleIds: string[]) {
      return supabase
        .from("assessment_cycles")
        .select("*")
        .eq("company_id", companyId)
        .in("id", assessmentCycleIds)
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
      return supabase.rpc("create_tenant_assessment_cycle_v1", {
        p_company_id: data.companyId,
        p_name: data.name,
        p_description: data.description ?? "",
        p_assessment_type: data.assessmentType,
        p_assessment_template_id: data.assessmentTemplateId,
        p_status: data.status,
        p_start_date: data.startDate,
        p_end_date: data.endDate,
        p_close_date: data.closeDate ?? null,
        p_allow_self_assessment: data.allowSelfAssessment,
        p_allow_manager_assessment: data.allowManagerAssessment,
        p_allow_peer_assessment: data.allowPeerAssessment,
        p_allow_direct_report_assessment: data.allowDirectReportAssessment,
        p_anonymous: data.anonymous,
        p_assessment_visibility: data.assessmentVisibility,
        p_idempotency_key: intentKey(
          "assessment-cycle:create",
          data.companyId,
          data.submissionId
        ),
      })
    },

    async update(data: UpdateAssessmentCycleData) {
      return supabase.rpc("update_tenant_assessment_cycle_v1", {
        p_company_id: data.companyId,
        p_assessment_cycle_id: data.assessmentCycleId,
        p_name: data.name,
        p_description: data.description ?? "",
        p_assessment_type: data.assessmentType,
        p_assessment_template_id: data.assessmentTemplateId,
        p_status: data.status,
        p_start_date: data.startDate,
        p_end_date: data.endDate,
        p_close_date: data.closeDate ?? null,
        p_allow_self_assessment: data.allowSelfAssessment,
        p_allow_manager_assessment: data.allowManagerAssessment,
        p_allow_peer_assessment: data.allowPeerAssessment,
        p_allow_direct_report_assessment: data.allowDirectReportAssessment,
        p_anonymous: data.anonymous,
        p_assessment_visibility: data.assessmentVisibility,
      })
    },

    async archive(
      companyId: string,
      assessmentCycleId: string
    ) {
      return supabase.rpc("archive_tenant_assessment_cycle_v1", {
        p_company_id: companyId,
        p_assessment_cycle_id: assessmentCycleId,
      })
    },
  }
}
