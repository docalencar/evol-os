"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"

import { createPositionRepository } from "../repositories/position-repository"
import { createPositionSchema } from "../schemas/position-schema"

type UpdatePositionActionState = {
  success: boolean
  message: string
}

export async function updatePositionAction(
  companyId: string,
  positionId: string,
  input: unknown
): Promise<UpdatePositionActionState> {
  const parsedInput =
    createPositionSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        "Dados inválidos para atualizar cargo.",
    }
  }

  const repository =
    await createPositionRepository()

  const { data: currentPosition } =
    await repository.findById(
      companyId,
      positionId
    )

  const { error } =
    await repository.update({
      companyId,
      positionId,
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

  if (error) {
    return {
      success: false,
      message:
        "Erro ao atualizar cargo.",
    }
  }

  try {
    await recordActivity({
      companyId,
      activityType: "position.updated",
      module: "organization",
      title: "Cargo atualizado",
      description:
        `O cargo ${parsedInput.data.name} foi atualizado.`,
      actorType: "user",
      entityType: "position",
      entityId: positionId,
      visibility: "company",
      metadata: {
        positionId,
        positionName:
          parsedInput.data.name,
        previousPositionName:
          currentPosition?.name ?? null,
        departmentId:
          parsedInput.data.departmentId ?? null,
        previousDepartmentId:
          currentPosition?.department_id ?? null,
        hierarchicalLevel:
          parsedInput.data.hierarchicalLevel,
        previousHierarchicalLevel:
          currentPosition?.hierarchical_level ??
          null,
        status:
          parsedInput.data.status,
        previousStatus:
          currentPosition?.status ?? null,
      },
    })
  } catch (activityError) {
    console.error(
      "Erro ao registrar atividade de atualização do cargo:",
      activityError
    )
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/positions")
  revalidatePath(
    `/app/company/positions/${positionId}`
  )

  return {
    success: true,
    message:
      "Cargo atualizado com sucesso.",
  }
}
