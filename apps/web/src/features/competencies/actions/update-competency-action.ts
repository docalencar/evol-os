"use server"

import { revalidatePath } from "next/cache"

import { createCompetencyRepository } from "../repositories/competency-repository"
import { updateCompetencySchema } from "../schemas/competency-schema"

export async function updateCompetencyAction(
  companyId: string,
  competencyId: string,
  input: unknown
) {
  const parsed = updateCompetencySchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const repository = await createCompetencyRepository()

  const { error } = await repository.update(
    companyId,
    competencyId,
    parsed.data
  )

  if (error) {
    return {
      success: false,
      message: "Não foi possível atualizar a competência.",
    }
  }

  revalidatePath("/app/competencies")

  return {
    success: true,
    message: "Competência atualizada com sucesso.",
  }
}
