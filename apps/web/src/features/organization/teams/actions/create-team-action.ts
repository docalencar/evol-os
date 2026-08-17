"use server"

import { revalidatePath } from "next/cache"

import {
  createTeam,
  isValidSubmissionId,
  PeopleOrganizationMutationError,
  submissionIdFromInput,
} from "@/features/people-organization-mutations"

import { createTeamSchema } from "../schemas/team-schema"

type CreateTeamActionState = {
  success: boolean
  message: string
}

export async function createTeamAction(
  companyId: string,
  input: unknown
): Promise<CreateTeamActionState> {
  const parsedInput = createTeamSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para criar time.",
    }
  }

  const submissionId = submissionIdFromInput(input)
  if (!isValidSubmissionId(submissionId)) {
    return {
      success: false,
      message: "Dados inválidos para criar time.",
    }
  }

  let teamId: string | undefined
  try {
    const result = await createTeam(
      companyId,
      parsedInput.data,
      submissionId
    )
    teamId = result.teamId
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof PeopleOrganizationMutationError
          ? error.message
          : "Erro ao criar time.",
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
  if (teamId) {
    revalidatePath(`/app/company/teams/${teamId}`)
  }

  return {
    success: true,
    message: "Time criado com sucesso.",
  }
}
