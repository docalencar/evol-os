"use server"

import { revalidatePath } from "next/cache"

import { publicSeniorityLevelMessage } from "../errors"
import { createSeniorityLevelRepository } from "../repositories/seniority-level-repository"
import { updateSeniorityLevelSchema } from "../schemas/seniority-level-schema"

export async function updateSeniorityLevelAction(
  companyId: string,
  seniorityLevelId: string,
  input: unknown
) {
  const parsed = updateSeniorityLevelSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const repository = await createSeniorityLevelRepository()
  const { error } = await repository.update(
    companyId,
    seniorityLevelId,
    parsed.data
  )

  if (error) {
    return {
      success: false,
      message: publicSeniorityLevelMessage(
        error,
        "Não foi possível atualizar a senioridade."
      ),
    }
  }

  revalidatePath("/app/company/seniority")

  return { success: true, message: "Senioridade atualizada com sucesso." }
}
