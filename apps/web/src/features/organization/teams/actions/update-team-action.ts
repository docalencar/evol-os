"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"

import { createTeamRepository } from "../repositories/team-repository"
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
  const parsedInput =
    createTeamSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        "Dados inválidos para atualizar time.",
    }
  }

  const teamRepository =
    await createTeamRepository()

  const { data: currentTeam } =
    await teamRepository.findById(
      companyId,
      teamId
    )

  const { error } =
    await teamRepository.update({
      companyId,
      teamId,
      name: parsedInput.data.name,
      description:
        parsedInput.data.description || null,
      departmentId:
        parsedInput.data.departmentId || null,
      parentTeamId:
        parsedInput.data.parentTeamId || null,
      leaderId:
        parsedInput.data.leaderId || null,
    })

  if (error) {
    return {
      success: false,
      message:
        "Erro ao atualizar time.",
    }
  }

  try {
    await recordActivity({
      companyId,
      activityType: "team.updated",
      module: "organization",
      title: "Time atualizado",
      description:
        `O time ${parsedInput.data.name} foi atualizado.`,
      actorType: "user",
      entityType: "team",
      entityId: teamId,
      visibility: "company",
      metadata: {
        teamId,
        teamName:
          parsedInput.data.name,
        previousTeamName:
          currentTeam?.name ?? null,
        departmentId:
          parsedInput.data.departmentId || null,
        previousDepartmentId:
          currentTeam?.department_id ?? null,
        parentTeamId:
          parsedInput.data.parentTeamId || null,
        previousParentTeamId:
          currentTeam?.parent_team_id ?? null,
        leaderId:
          parsedInput.data.leaderId || null,
        previousLeaderId:
          currentTeam?.manager_id ?? null,
      },
    })
  } catch (activityError) {
    console.error(
      "Erro ao registrar atividade de atualização do time:",
      activityError
    )
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/teams")
  revalidatePath("/app/company/departments")

  const affectedDepartmentIds =
    new Set(
      [
        currentTeam?.department_id,
        parsedInput.data.departmentId,
      ].filter(
        (
          departmentId
        ): departmentId is string =>
          Boolean(departmentId)
      )
    )

  for (
    const departmentId
    of affectedDepartmentIds
  ) {
    revalidatePath(
      `/app/company/departments/${departmentId}`
    )
  }

  revalidatePath(
    `/app/company/teams/${teamId}`
  )

  return {
    success: true,
    message:
      "Time atualizado com sucesso.",
  }
}
