"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"

import { createDepartmentRepository } from "../repositories/department-repository"
import { createDepartmentSchema } from "../schemas/department-schema"

type UpdateDepartmentActionState = {
  success: boolean
  message: string
}

export async function updateDepartmentAction(
  companyId: string,
  departmentId: string,
  input: unknown
): Promise<UpdateDepartmentActionState> {
  const parsedInput =
    createDepartmentSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        "Dados inválidos para atualizar departamento.",
    }
  }

  const departmentRepository =
    await createDepartmentRepository()

  const { data: currentDepartment } =
    await departmentRepository.findById(
      companyId,
      departmentId
    )

  const { error } =
    await departmentRepository.update({
      companyId,
      departmentId,
      name: parsedInput.data.name,
      description:
        parsedInput.data.description || null,
      leaderId:
        parsedInput.data.leaderId || null,
    })

  if (error) {
    return {
      success: false,
      message:
        "Erro ao atualizar departamento.",
    }
  }

  try {
    await recordActivity({
      companyId,
      activityType: "department.updated",
      module: "organization",
      title: "Departamento atualizado",
      description: `O departamento ${parsedInput.data.name} foi atualizado.`,
      actorType: "user",
      entityType: "department",
      entityId: departmentId,
      visibility: "company",
      metadata: {
        departmentId,
        departmentName:
          parsedInput.data.name,
        previousDepartmentName:
          currentDepartment?.name ?? null,
      },
    })
  } catch (activityError) {
    console.error(
      "Erro ao registrar atividade de atualização do departamento:",
      activityError
    )
  }

  revalidatePath("/app/company")
  revalidatePath(
    `/app/company/departments/${departmentId}`
  )

  return {
    success: true,
    message:
      "Departamento atualizado com sucesso.",
  }
}
