"use server"

import { revalidatePath } from "next/cache"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { publicPositionSeniorityCompetencyMessage } from "../errors"
import { createPositionSeniorityCompetencyRepository } from "../repositories/position-seniority-competency-repository"
import { setPositionSeniorityCompetencySchema } from "../schemas/position-seniority-competency-command-schema"

export async function setPositionSeniorityCompetencyAction(input: unknown) {
  const parsed = setPositionSeniorityCompetencySchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const { companyId } = await getCurrentCompanyContext()
  const repository = await createPositionSeniorityCompetencyRepository()
  const { positionId, profileId, competencyId, ...expectation } = parsed.data
  const { error } = await repository.set(
    companyId,
    profileId,
    competencyId,
    expectation
  )

  if (error) {
    return {
      success: false,
      message: publicPositionSeniorityCompetencyMessage(
        error,
        "Não foi possível salvar a expectativa de competência."
      ),
    }
  }

  revalidatePath(`/app/company/positions/${positionId}`)

  return { success: true, message: "Expectativa de competência salva." }
}
