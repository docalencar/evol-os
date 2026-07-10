"use server"

import { revalidatePath } from "next/cache"

import { createEmployeeCompetencyRepository } from "../repositories/employee-competency-repository"
import { createEmployeeCompetencySchema } from "../schemas/employee-competency-schema"

export async function createEmployeeCompetencyAction(
  companyId: string,
  input: unknown
) {
  const parsed = createEmployeeCompetencySchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const repository = await createEmployeeCompetencyRepository()

  const { error } = await repository.create(companyId, parsed.data)

  if (error) {
    return {
      success: false,
      message: "Não foi possível cadastrar a competência do colaborador.",
    }
  }

  revalidatePath("/app/people")

  return {
    success: true,
    message: "Competência do colaborador criada com sucesso.",
  }
}
