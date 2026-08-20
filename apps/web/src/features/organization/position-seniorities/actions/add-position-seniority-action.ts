"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { publicPositionSeniorityMessage } from "../errors"
import { createPositionSeniorityProfileRepository } from "../repositories/position-seniority-profile-repository"

const addSchema = z.object({
  positionId: z.string().uuid(),
  seniorityLevelId: z.string().uuid("Selecione uma senioridade."),
})

export async function addPositionSeniorityAction(input: unknown) {
  const parsed = addSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const { companyId } = await getCurrentCompanyContext()
  const repository = await createPositionSeniorityProfileRepository()

  // The boundary is idempotent on the natural key: a re-add returns
  // already_applicable with no error — treated here as success.
  const { error } = await repository.add(
    companyId,
    parsed.data.positionId,
    parsed.data.seniorityLevelId
  )

  if (error) {
    return {
      success: false,
      message: publicPositionSeniorityMessage(
        error,
        "Não foi possível aplicar a senioridade ao cargo."
      ),
    }
  }

  revalidatePath(`/app/company/positions/${parsed.data.positionId}`)

  return { success: true, message: "Senioridade aplicada ao cargo." }
}
