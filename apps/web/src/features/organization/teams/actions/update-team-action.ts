"use server"

import { revalidatePath } from "next/cache"

import {
  updateTeam,
  PeopleOrganizationMutationError,
} from "@/features/people-organization-mutations"

import { createTeamSchema } from "../schemas/team-schema"

type UpdateTeamActionState = {
  success: boolean
  message: string
}

export async function updateTeamAction(
  companyId: string,
  teamId: string,
  input: unknown
): Promise<UpdateTeamActionState> {
  const parsedInput = createTeamSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para atualizar time.",
    }
  }

  try {
    await updateTeam(companyId, teamId, parsedInput.data)
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof PeopleOrganizationMutationError
          ? error.message
          : "Erro ao atualizar time.",
    }
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/teams")
  revalidatePath("/app/company/departments")
  if (parsedInput.data.departmentId) {
    revalidatePath(
      `/app/company/departments/${parsedInput.data.departmentId}`
    )
  }
  revalidatePath(`/app/company/teams/${teamId}`)

  return {
    success: true,
    message: "Time atualizado com sucesso.",
  }
}
