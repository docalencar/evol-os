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
      return supabase.from("assessment_templates").insert({
        company_id: data.companyId,
        name: data.name,
        description: data.description ?? null,
        instructions: data.instructions ?? null,
        type: data.type,
        status: data.status,
        active: data.status === "active",
      })
    },

    async update(data: UpdateAssessmentTemplateData) {
      return supabase
        .from("assessment_templates")
        .update({
          name: data.name,
          description: data.description ?? null,
          instructions: data.instructions ?? null,
          type: data.type,
          status: data.status,
          active: data.status === "active",
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", data.companyId)
        .eq("id", data.assessmentTemplateId)
        .is("deleted_at", null)
    },

    async archive(
      companyId: string,
      assessmentTemplateId: string
    ) {
      return supabase
        .from("assessment_templates")
        .update({
          status: "archived",
          active: false,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", assessmentTemplateId)
        .is("deleted_at", null)
    },
  }
}
