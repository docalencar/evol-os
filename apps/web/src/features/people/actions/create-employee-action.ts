"use server"

import { revalidatePath } from "next/cache"

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
  const parsedInput = createEmployeeSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para criar colaborador.",
    }
  }

  const employeeRepository = await createEmployeeRepository()

  const { error } = await employeeRepository.create(companyId, parsedInput.data)

  if (error) {
    return {
      success: false,
      message: error.message,
    }
  }

  revalidatePath("/app/people")

  return {
    success: true,
    message: "Colaborador criado com sucesso.",
  }
}
