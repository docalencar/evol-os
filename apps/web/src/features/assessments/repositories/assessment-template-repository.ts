import { createServerDatabase } from "@/lib/database/server-database"

import type {
  AssessmentTemplateStatus,
  AssessmentTemplateType,
} from "../types/assessment-template"

type CreateAssessmentTemplateData = {
  companyId: string
  name: string
  description?: string | null
  instructions?: string | null
  type: AssessmentTemplateType
  status: AssessmentTemplateStatus
}

type UpdateAssessmentTemplateData = CreateAssessmentTemplateData & {
  assessmentTemplateId: string
}

export async function createAssessmentTemplateRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByCompany(companyId: string) {
      return supabase
        .from("assessment_templates")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
    },

    async findById(
      companyId: string,
      assessmentTemplateId: string
    ) {
      return supabase
        .from("assessment_templates")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", assessmentTemplateId)
        .is("deleted_at", null)
        .single()
    },

    async create(data: CreateAssessmentTemplateData) {
      return supabase.rpc("create_tenant_assessment_template_v1", {
        p_company_id: data.companyId,
        p_name: data.name,
        p_description: data.description ?? "",
        p_instructions: data.instructions ?? "",
        p_type: data.type,
        p_status: data.status,
      })
    },

    async update(data: UpdateAssessmentTemplateData) {
      return supabase.rpc("update_tenant_assessment_template_v1", {
        p_company_id: data.companyId,
        p_assessment_template_id: data.assessmentTemplateId,
        p_name: data.name,
        p_description: data.description ?? "",
        p_instructions: data.instructions ?? "",
        p_type: data.type,
        p_status: data.status,
      })
    },

    async archive(
      companyId: string,
      assessmentTemplateId: string
    ) {
      return supabase.rpc("archive_tenant_assessment_template_v1", {
        p_company_id: companyId,
        p_assessment_template_id: assessmentTemplateId,
      })
    },
  }
}
