"use server"

import { revalidatePath } from "next/cache"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { publicPositionSeniorityCompetencyMessage } from "../errors"
import { createPositionSeniorityCompetencyRepository } from "../repositories/position-seniority-competency-repository"
import { clearPositionSeniorityCompetencySchema } from "../schemas/position-seniority-competency-command-schema"

export async function clearPositionSeniorityCompetencyAction(input: unknown) {
  const parsed = clearPositionSeniorityCompetencySchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const { companyId } = await getCurrentCompanyContext()
  const { positionId, profileId, competencyId } = parsed.data
  const repository = await createPositionSeniorityCompetencyRepository()
  const { error } = await repository.clear(companyId, profileId, competencyId)

  if (error) {
    return {
      success: false,
      message: publicPositionSeniorityCompetencyMessage(
        error,
        "Não foi possível remover a expectativa de competência."
      ),
    }
  }

  revalidatePath(`/app/company/positions/${positionId}`)

  return { success: true, message: "Expectativa de competência removida." }
}
