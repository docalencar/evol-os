"use server"

import { revalidatePath } from "next/cache"

import { createPositionCompetencyRepository } from "../repositories/position-competency-repository"
import { updatePositionCompetencySchema } from "../schemas/position-competency-schema"

export async function updatePositionCompetencyAction(
  companyId: string,
  positionCompetencyId: string,
  input: unknown
) {
  const parsed = updatePositionCompetencySchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const repository = await createPositionCompetencyRepository()

  const { error } = await repository.update(
    companyId,
    positionCompetencyId,
    parsed.data
  )

  if (error) {
    return {
      success: false,
      message: "Não foi possível atualizar o vínculo da competência.",
    }
  }

  revalidatePath("/app/company/positions")

  return {
    success: true,
    message: "Competência do cargo atualizada com sucesso.",
  }
}
