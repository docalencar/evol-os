"use server"

import { revalidatePath } from "next/cache"

import {
  archiveTeam,
  PeopleOrganizationMutationError,
} from "@/features/people-organization-mutations"

export async function archiveTeamAction(
  companyId: string,
  teamId: string
) {
  try {
    await archiveTeam(companyId, teamId)
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof PeopleOrganizationMutationError
          ? error.message
          : "Erro ao arquivar time.",
    }
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/teams")
  revalidatePath(`/app/company/teams/${teamId}`)

  return {
    success: true,
    message: "Time arquivado com sucesso.",
  }
}
