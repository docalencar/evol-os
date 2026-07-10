"use server"

import { revalidatePath } from "next/cache"

import { createEmployeeCompetencyRepository } from "../repositories/employee-competency-repository"
import { updateEmployeeCompetencySchema } from "../schemas/employee-competency-schema"

export async function updateEmployeeCompetencyAction(
  companyId: string,
  employeeCompetencyId: string,
  input: unknown
) {
  const parsed = updateEmployeeCompetencySchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const repository = await createEmployeeCompetencyRepository()

  const { error } = await repository.update(
    companyId,
    employeeCompetencyId,
    parsed.data
  )

  if (error) {
    return {
      success: false,
      message: "Não foi possível atualizar a competência do colaborador.",
    }
  }

  revalidatePath("/app/people")

  return {
    success: true,
    message: "Competência do colaborador atualizada com sucesso.",
  }
}