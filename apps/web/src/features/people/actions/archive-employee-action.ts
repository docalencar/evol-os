"use server"

import { revalidatePath } from "next/cache"

import {
  archivePerson,
  PeopleOrganizationMutationError,
} from "@/features/people-organization-mutations"

export async function archiveEmployeeAction(
  companyId: string,
  employeeId: string
) {
  try {
    // Trusted boundary sets status='terminated' and atomically deactivates the
    // linked tenant membership (PD-019), with last-owner protection. The
    // application must not couple people + company_members writes itself.
    await archivePerson(companyId, employeeId)
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof PeopleOrganizationMutationError
          ? error.message
          : "Erro ao arquivar colaborador.",
    }
  }

  revalidatePath("/app/people")
  revalidatePath(`/app/people/${employeeId}`)

  return {
    success: true,
    message: "Colaborador arquivado com sucesso.",
  }
}
