"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"

import { createDepartmentRepository } from "../repositories/department-repository"

export async function archiveDepartmentAction(
  companyId: string,
  departmentId: string
) {
  const repository =
    await createDepartmentRepository()

  const { data: department } =
    await repository.findById(
      companyId,
      departmentId
    )

  const { error } =
    await repository.archive(
      companyId,
      departmentId
    )

  if (error) {
    return {
      success: false,
      message:
        "Erro ao arquivar departamento.",
    }
  }

  try {
    await recordActivity({
      companyId,
      activityType: "department.archived",
      module: "organization",
      title: "Departamento arquivado",
      description: department?.name
        ? `O departamento ${department.name} foi arquivado.`
        : "Um departamento foi arquivado.",
      actorType: "user",
      entityType: "department",
      entityId: departmentId,
      visibility: "company",
      metadata: {
        departmentId,
        departmentName:
          department?.name ?? null,
      },
    })
  } catch (activityError) {
    console.error(
      "Erro ao registrar atividade de arquivamento do departamento:",
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
      "Departamento arquivado com sucesso.",
  }
}
