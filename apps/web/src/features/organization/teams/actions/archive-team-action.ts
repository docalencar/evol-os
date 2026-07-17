"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"

import { createTeamRepository } from "../repositories/team-repository"

export async function archiveTeamAction(
  companyId: string,
  teamId: string
) {
  const repository =
    await createTeamRepository()

  const { data: team } =
    await repository.findById(
      companyId,
      teamId
    )

  const { error } =
    await repository.archive(
      companyId,
      teamId
    )

  if (error) {
    return {
      success: false,
      message:
        "Erro ao arquivar time.",
    }
  }

  try {
    await recordActivity({
      companyId,
      activityType: "team.archived",
      module: "organization",
      title: "Time arquivado",
      description: team?.name
        ? `O time ${team.name} foi arquivado.`
        : "Um time foi arquivado.",
      actorType: "user",
      entityType: "team",
      entityId: teamId,
      visibility: "company",
      metadata: {
        teamId,
        teamName:
          team?.name ?? null,
        parentTeamId:
          team?.parent_team_id ?? null,
        leaderId:
          team?.manager_id ?? null,
      },
    })
  } catch (activityError) {
    console.error(
      "Erro ao registrar atividade de arquivamento do time:",
      activityError
    )
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/teams")
  revalidatePath(
    `/app/company/teams/${teamId}`
  )

  return {
    success: true,
    message:
      "Time arquivado com sucesso.",
  }
}
