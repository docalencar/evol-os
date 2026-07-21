"use server"

import {
  failureResult,
  successResult,
} from "@/lib/actions"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  changeJobOpeningStatusSchema,
} from "../schemas/job-opening-schema"
import {
  changeJobOpeningStatus,
} from "../services/change-job-opening-status"

export async function changeJobOpeningStatusAction(
  values: unknown
) {
  const parsed =
    changeJobOpeningStatusSchema.safeParse(
      values
    )

  if (!parsed.success) {
    return failureResult(
      parsed.error.issues[0]?.message ??
        "Dados inválidos para atualizar o status da vaga."
    )
  }

  try {
    const {
      companyId,
      personId,
      user,
    } = await getCurrentCompanyContext()

    const jobOpening =
      await changeJobOpeningStatus({
        companyId,
        userId: user.id,
        actorPersonId: personId,
        values: parsed.data,
      })

    return successResult(
      "Status da vaga atualizado com sucesso.",
      jobOpening
    )
  } catch (error) {
    console.error(
      "Erro ao atualizar status da vaga:",
      error
    )

    return failureResult(
      error instanceof Error
        ? error.message
        : "Não foi possível atualizar o status da vaga."
    )
  }
}
