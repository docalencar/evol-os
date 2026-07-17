"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"

import { createEmployeeRepository } from "../repositories/employee-repository"
import { createEmployeeSchema } from "../schemas/employee-schema"

type CreateEmployeeActionState = {
  success: boolean
  message: string
}

export async function createEmployeeAction(
  companyId: string,
  input: unknown
): Promise<CreateEmployeeActionState> {
  const parsedInput =
    createEmployeeSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        "Dados inválidos para criar colaborador.",
    }
  }

  const employeeRepository =
    await createEmployeeRepository()

  const { data, error } =
    await employeeRepository.create(
      companyId,
      parsedInput.data
    )

  if (error || !data) {
    return {
      success: false,
      message:
        error?.message ??
        "Erro ao criar colaborador.",
    }
  }

  try {
    await recordActivity({
      companyId,
      activityType: "employee.created",
      module: "people",
      title: "Colaborador criado",
      description:
        `O colaborador ${data.full_name} foi criado.`,
      actorType: "user",
      entityType: "employee",
      entityId: data.id,
      subjectType: "employee",
      subjectId: data.id,
      visibility: "company",
      metadata: {
        employeeId: data.id,
        employeeName: data.full_name,
        status: parsedInput.data.status,
        teamId:
          parsedInput.data.teamId || null,
        positionId:
          parsedInput.data.positionId || null,
        managerId:
          parsedInput.data.managerId || null,
        hireDate:
          parsedInput.data.hireDate || null,
      },
    })
  } catch (activityError) {
    console.error(
      "Erro ao registrar atividade de criação do colaborador:",
      activityError
    )
  }

  revalidatePath("/app/people")
  revalidatePath(`/app/people/${data.id}`)

  return {
    success: true,
    message:
      "Colaborador criado com sucesso.",
  }
}
