"use server"

import { getManagementDepartments } from "@/features/dashboard-read"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export type TeamDepartmentOption = {
  value: string
  label: string
}

type GetTeamDepartmentOptionsActionResult =
  | {
      success: true
      options: TeamDepartmentOption[]
    }
  | {
      success: false
      message: string
      options: TeamDepartmentOption[]
    }

export async function getTeamDepartmentOptionsAction(): Promise<GetTeamDepartmentOptionsActionResult> {
  try {
    const { companyId } = await getCurrentCompanyContext()
    const departments =
      await getManagementDepartments(companyId)

    return {
      success: true,
      options: departments.map((department) => ({
        value: department.id,
        label: department.name,
      })),
    }
  } catch {
    return {
      success: false,
      message:
        "Não foi possível carregar os departamentos.",
      options: [],
    }
  }
}
