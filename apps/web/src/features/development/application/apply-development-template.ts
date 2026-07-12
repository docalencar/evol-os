import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export type ApplyDevelopmentTemplateInput = {
  employeeId: string
  templateId: string
  ownerId?: string
  priority: "low" | "medium" | "high"
  startDate?: string
  dueDate?: string
}

export async function applyDevelopmentTemplate(
  input: ApplyDevelopmentTemplateInput
) {
  const {
    supabase,
    companyId,
  } = await getCurrentCompanyContext()

  const { data, error } = await supabase.rpc(
    "apply_development_template",
    {
      p_company_id: companyId,
      p_employee_id: input.employeeId,
      p_template_id: input.templateId,
      p_priority: input.priority,
      p_owner_id: input.ownerId ?? null,
      p_start_date: input.startDate ?? null,
      p_due_date: input.dueDate ?? null,
    }
  )

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error(
      "A função apply_development_template não retornou o ID do plano."
    )
  }

  return {
    planId: data as string,
  }
}