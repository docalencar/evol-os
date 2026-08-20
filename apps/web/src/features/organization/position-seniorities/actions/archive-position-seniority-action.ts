"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { publicPositionSeniorityMessage } from "../errors"
import { createPositionSeniorityProfileRepository } from "../repositories/position-seniority-profile-repository"

const archiveSchema = z.object({
  positionId: z.string().uuid(),
  profileId: z.string().uuid(),
})

export async function archivePositionSeniorityAction(input: unknown) {
  const parsed = archiveSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const { companyId } = await getCurrentCompanyContext()
  const repository = await createPositionSeniorityProfileRepository()

  const { error } = await repository.archive(
    companyId,
    parsed.data.profileId
  )

  if (error) {
    return {
      success: false,
      message: publicPositionSeniorityMessage(
        error,
        "Não foi possível remover a senioridade do cargo."
      ),
    }
  }

  revalidatePath(`/app/company/positions/${parsed.data.positionId}`)

  return { success: true, message: "Senioridade removida do cargo." }
}
