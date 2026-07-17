"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"

import { createEmployeeRepository } from "../repositories/employee-repository"
import { updateEmployeeSchema } from "../schemas/employee-schema"

type UpdateEmployeeActionState = {
  success: boolean
  message: string
}

export async function updateEmployeeAction(
  companyId: string,
  employeeId: string,
  input: unknown
): Promise<UpdateEmployeeActionState> {
  const parsedInput =
    updateEmployeeSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        "Dados inválidos para atualizar colaborador.",
    }
  }

  const employeeRepository =
    await createEmployeeRepository()

  const { data: currentEmployee } =
    await employeeRepository.findById(
      companyId,
      employeeId
    )

  const { error } =
    await employeeRepository.update(
      companyId,
      employeeId,
      parsedInput.data
    )

  if (error) {
    return {
      success: false,
      message:
        "Erro ao atualizar colaborador.",
    }
  }

  const employeeName =
    parsedInput.data.fullName ??
    currentEmployee?.full_name ??
    "Colaborador"

  try {
    await recordActivity({
      companyId,
      activityType: "employee.updated",
      module: "people",
      title: "Colaborador atualizado",
      description:
        `Os dados de ${employeeName} foram atualizados.`,
      actorType: "user",
      entityType: "employee",
      entityId: employeeId,
      subjectType: "employee",
      subjectId: employeeId,
      visibility: "company",
      metadata: {
        employeeId,
        employeeName,
        previousEmployeeName:
          currentEmployee?.full_name ?? null,
        status:
          parsedInput.data.status ??
          currentEmployee?.status ??
          null,
        previousStatus:
          currentEmployee?.status ?? null,
        teamId:
          parsedInput.data.teamId ??
          currentEmployee?.team_id ??
          null,
        previousTeamId:
          currentEmployee?.team_id ?? null,
        positionId:
          parsedInput.data.positionId ??
          currentEmployee?.position_id ??
          null,
        previousPositionId:
          currentEmployee?.position_id ?? null,
        managerId:
          parsedInput.data.managerId ??
          currentEmployee?.manager_id ??
          null,
        previousManagerId:
          currentEmployee?.manager_id ?? null,
      },
    })
  } catch (activityError) {
    console.error(
      "Erro ao registrar atividade de atualização do colaborador:",
      activityError
    )
  }

  revalidatePath("/app/people")
  revalidatePath(`/app/people/${employeeId}`)

  return {
    success: true,
    message:
      "Colaborador atualizado com sucesso.",
  }
}
