"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"

import { createPositionRepository } from "../repositories/position-repository"
import { createPositionSchema } from "../schemas/position-schema"

type CreatePositionActionState = {
  success: boolean
  message: string
}

export async function createPositionAction(
  companyId: string,
  input: unknown
): Promise<CreatePositionActionState> {
  const parsedInput =
    createPositionSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        "Dados inválidos para criar cargo.",
    }
  }

  const repository =
    await createPositionRepository()

  const { data, error } =
    await repository.create({
      companyId,
      name: parsedInput.data.name,
      description:
        parsedInput.data.description || null,
      departmentId:
        parsedInput.data.departmentId ?? null,
      hierarchicalLevel:
        parsedInput.data.hierarchicalLevel,
      status:
        parsedInput.data.status,
      weeklyWorkloadHours:
        parsedInput.data.weeklyWorkloadHours,
      workModel:
        parsedInput.data.workModel,
      employmentType:
        parsedInput.data.employmentType,
      travelRequirement:
        parsedInput.data.travelRequirement,
    })

  if (error || !data) {
    return {
      success: false,
      message:
        error?.message ??
        "Erro ao criar cargo.",
    }
  }

  try {
    await recordActivity({
      companyId,
      activityType: "position.created",
      module: "organization",
      title: "Cargo criado",
      description:
        `O cargo ${data.name} foi criado.`,
      actorType: "user",
      entityType: "position",
      entityId: data.id,
      visibility: "company",
      metadata: {
        positionId: data.id,
        positionName: data.name,
        departmentId:
          parsedInput.data.departmentId ?? null,
        hierarchicalLevel:
          parsedInput.data.hierarchicalLevel,
        status:
          parsedInput.data.status,
      },
    })
  } catch (activityError) {
    console.error(
      "Erro ao registrar atividade de criação do cargo:",
      activityError
    )
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/positions")
  revalidatePath(
    `/app/company/positions/${data.id}`
  )

  return {
    success: true,
    message: "Cargo criado com sucesso.",
  }
}
