"use server"

import { revalidatePath } from "next/cache"

import {
  archiveDepartment,
  PeopleOrganizationMutationError,
} from "@/features/people-organization-mutations"

export async function archiveDepartmentAction(
  companyId: string,
  departmentId: string
) {
  try {
    await archiveDepartment(companyId, departmentId)
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof PeopleOrganizationMutationError
          ? error.message
          : "Erro ao arquivar departamento.",
    }
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/departments")
  revalidatePath(`/app/company/departments/${departmentId}`)

  return {
    success: true,
    message: "Departamento arquivado com sucesso.",
  }
}
