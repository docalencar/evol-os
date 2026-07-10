"use server"

import { revalidatePath } from "next/cache"

import { createPositionCompetencyRepository } from "../repositories/position-competency-repository"
import { createPositionCompetencySchema } from "../schemas/position-competency-schema"

export async function createPositionCompetencyAction(
  companyId: string,
  input: unknown
) {
  const parsed = createPositionCompetencySchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const repository = await createPositionCompetencyRepository()
  const { error } = await repository.create(companyId, parsed.data)

  if (error) {
    return {
      success: false,
      message: "Não foi possível vincular a competência ao cargo.",
    }
  }

  revalidatePath("/app/company/positions")

  return {
    success: true,
    message: "Competência vinculada ao cargo com sucesso.",
  }
}
