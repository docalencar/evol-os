import { createServerDatabase } from "@/lib/database/server-database"

type CreateAssessmentSectionData = {
  companyId: string
  assessmentTemplateId: string
  code?: string | null
  name: string
  description?: string | null
  icon?: string | null
  color?: string | null
  weight: number
  displayOrder: number
  active: boolean
}

type UpdateAssessmentSectionData = CreateAssessmentSectionData & {
  assessmentSectionId: string
}

export async function createAssessmentSectionRepository() {
  const supabase = await createServerDatabase()

  return {
    async findAllByTemplate(
      companyId: string,
      assessmentTemplateId: string
    ) {
      return supabase
        .from("assessment_sections")
        .select("*")
        .eq("company_id", companyId)
        .eq("assessment_template_id", assessmentTemplateId)
        .is("deleted_at", null)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true })
    },

    async findById(
      companyId: string,
      assessmentSectionId: string
    ) {
      return supabase
        .from("assessment_sections")
        .select("*")
        .eq("company_id", companyId)
        .eq("id", assessmentSectionId)
        .is("deleted_at", null)
        .single()
    },

    async create(data: CreateAssessmentSectionData) {
      return supabase.rpc("create_tenant_assessment_section_v1", {
        p_company_id: data.companyId,
        p_assessment_template_id: data.assessmentTemplateId,
        p_code: data.code ?? "",
        p_name: data.name,
        p_description: data.description ?? "",
        p_icon: data.icon ?? "",
        p_color: data.color ?? "",
        p_weight: data.weight,
        p_display_order: data.displayOrder,
        p_active: data.active,
      })
    },

    async update(data: UpdateAssessmentSectionData) {
      return supabase.rpc("update_tenant_assessment_section_v1", {
        p_company_id: data.companyId,
        p_assessment_section_id: data.assessmentSectionId,
        p_assessment_template_id: data.assessmentTemplateId,
        p_code: data.code ?? "",
        p_name: data.name,
        p_description: data.description ?? "",
        p_icon: data.icon ?? "",
        p_color: data.color ?? "",
        p_weight: data.weight,
        p_display_order: data.displayOrder,
        p_active: data.active,
      })
    },

    async archive(
      companyId: string,
      assessmentSectionId: string
    ) {
      return supabase.rpc("archive_tenant_assessment_section_v1", {
        p_company_id: companyId,
        p_assessment_section_id: assessmentSectionId,
      })
    },
  }
}
