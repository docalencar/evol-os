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
      return supabase.from("assessment_sections").insert({
        company_id: data.companyId,
        assessment_template_id: data.assessmentTemplateId,
        code: data.code ?? null,
        name: data.name,
        description: data.description ?? null,
        icon: data.icon ?? null,
        color: data.color ?? null,
        weight: data.weight,
        display_order: data.displayOrder,
        active: data.active,
      })
    },

    async update(data: UpdateAssessmentSectionData) {
      return supabase
        .from("assessment_sections")
        .update({
          assessment_template_id: data.assessmentTemplateId,
          code: data.code ?? null,
          name: data.name,
          description: data.description ?? null,
          icon: data.icon ?? null,
          color: data.color ?? null,
          weight: data.weight,
          display_order: data.displayOrder,
          active: data.active,
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", data.companyId)
        .eq("id", data.assessmentSectionId)
        .is("deleted_at", null)
    },

    async archive(
      companyId: string,
      assessmentSectionId: string
    ) {
      return supabase
        .from("assessment_sections")
        .update({
          active: false,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("company_id", companyId)
        .eq("id", assessmentSectionId)
        .is("deleted_at", null)
    },
  }
}
