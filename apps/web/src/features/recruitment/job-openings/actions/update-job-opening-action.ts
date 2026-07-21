"use server"

import {
  failureResult,
  successResult,
} from "@/lib/actions"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  updateJobOpeningSchema,
} from "../schemas/job-opening-schema"
import {
  updateJobOpening,
} from "../services/update-job-opening"

export async function updateJobOpeningAction(
  values: unknown
) {
  const parsed =
    updateJobOpeningSchema.safeParse(values)

  if (!parsed.success) {
    return failureResult(
      parsed.error.issues[0]?.message ??
        "Dados inválidos para atualizar a vaga."
    )
  }

  try {
    const { companyId, user } =
      await getCurrentCompanyContext()

    const jobOpening =
      await updateJobOpening({
        companyId,
        userId: user.id,
        values: parsed.data,
      })

    return successResult(
      "Vaga atualizada com sucesso.",
      jobOpening
    )
  } catch (error) {
    console.error(
      "Erro ao atualizar vaga:",
      error
    )

    return failureResult(
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar a vaga."
    )
  }
}
