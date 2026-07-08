"use server"

import { revalidatePath } from "next/cache"

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
  const parsedInput = updateEmployeeSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para atualizar colaborador.",
    }
  }

  const employeeRepository = await createEmployeeRepository()

  const { error } = await employeeRepository.update(
    companyId,
    employeeId,
    parsedInput.data
  )

  if (error) {
    return {
      success: false,
      message: "Erro ao atualizar colaborador.",
    }
  }

  revalidatePath("/app/people")

  return {
    success: true,
    message: "Colaborador atualizado com sucesso.",
  }
}
