"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"

import { createTeamRepository } from "../repositories/team-repository"
import { createTeamSchema } from "../schemas/team-schema"

type CreateTeamActionState = {
  success: boolean
  message: string
}

export async function createTeamAction(
  companyId: string,
  input: unknown
): Promise<CreateTeamActionState> {
  const parsedInput =
    createTeamSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        "Dados inválidos para criar time.",
    }
  }

  const teamRepository =
    await createTeamRepository()

  const { data, error } =
    await teamRepository.create({
      companyId,
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

  if (error || !data) {
    return {
      success: false,
      message:
        error?.message ??
        "Erro ao criar time.",
    }
  }

  try {
    await recordActivity({
      companyId,
      activityType: "team.created",
      module: "organization",
      title: "Time criado",
      description:
        `O time ${data.name} foi criado.`,
      actorType: "user",
      entityType: "team",
      entityId: data.id,
      visibility: "company",
      metadata: {
        teamId: data.id,
        teamName: data.name,
        departmentId:
          parsedInput.data.departmentId || null,
        parentTeamId:
          parsedInput.data.parentTeamId || null,
        leaderId:
          parsedInput.data.leaderId || null,
      },
    })
  } catch (activityError) {
    console.error(
      "Erro ao registrar atividade de criação do time:",
      activityError
    )
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/teams")
  revalidatePath("/app/company/departments")

  if (parsedInput.data.departmentId) {
    revalidatePath(
      `/app/company/departments/${parsedInput.data.departmentId}`
    )
  }

  revalidatePath(
    `/app/company/teams/${data.id}`
  )

  return {
    success: true,
    message: "Time criado com sucesso.",
  }
}
