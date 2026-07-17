"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"

import { createEmployeeRepository } from "../repositories/employee-repository"

export async function archiveEmployeeAction(
  companyId: string,
  employeeId: string
) {
  const repository =
    await createEmployeeRepository()

  const { data: employee } =
    await repository.findById(
      companyId,
      employeeId
    )

  const { error } =
    await repository.archive(
      companyId,
      employeeId
    )

  if (error) {
    return {
      success: false,
      message:
        "Erro ao arquivar colaborador.",
    }
  }

  try {
    await recordActivity({
      companyId,
      activityType: "employee.archived",
      module: "people",
      title: "Colaborador arquivado",
      description: employee?.full_name
        ? `O colaborador ${employee.full_name} foi arquivado.`
        : "Um colaborador foi arquivado.",
      actorType: "user",
      entityType: "employee",
      entityId: employeeId,
      subjectType: "employee",
      subjectId: employeeId,
      visibility: "company",
      metadata: {
        employeeId,
        employeeName:
          employee?.full_name ?? null,
        previousStatus:
          employee?.status ?? null,
        status: "terminated",
        teamId:
          employee?.team_id ?? null,
        positionId:
          employee?.position_id ?? null,
        managerId:
          employee?.manager_id ?? null,
      },
    })
  } catch (activityError) {
    console.error(
      "Erro ao registrar atividade de arquivamento do colaborador:",
      activityError
    )
  }

  revalidatePath("/app/people")
  revalidatePath(`/app/people/${employeeId}`)

  return {
    success: true,
    message:
      "Colaborador arquivado com sucesso.",
  }
}
