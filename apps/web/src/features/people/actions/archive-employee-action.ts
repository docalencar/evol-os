"use server"

import { revalidatePath } from "next/cache"

import { createEmployeeRepository } from "../repositories/employee-repository"

export async function archiveEmployeeAction(
  companyId: string,
  employeeId: string
) {
  const repository = await createEmployeeRepository()

  const { error } = await repository.archive(companyId, employeeId)

  if (error) {
    return {
      success: false,
      message: "Erro ao arquivar colaborador.",
    }
  }

  revalidatePath("/app/people")

  return {
    success: true,
    message: "Colaborador arquivado com sucesso.",
  }
}
