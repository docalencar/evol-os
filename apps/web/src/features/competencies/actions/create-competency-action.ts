"use server"

import { revalidatePath } from "next/cache"

import { createCompetencyRepository } from "../repositories/competency-repository"
import { createCompetencySchema } from "../schemas/competency-schema"

export async function createCompetencyAction(
  companyId: string,
  input: unknown
) {
  const parsed = createCompetencySchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const repository = await createCompetencyRepository()

  const { error } = await repository.create(companyId, parsed.data)

  if (error) {
    return {
      success: false,
      message: "Não foi possível cadastrar a competência.",
    }
  }

  revalidatePath("/app/competencies")

  return {
    success: true,
    message: "Competência criada com sucesso.",
  }
}

