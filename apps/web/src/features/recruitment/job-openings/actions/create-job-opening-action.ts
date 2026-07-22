"use server"

import { revalidatePath } from "next/cache"

import {
  failureResult,
  successResult,
} from "@/lib/actions"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  createJobOpeningSchema,
} from "../schemas/job-opening-schema"
import {
  createJobOpening,
} from "../services/create-job-opening"

export async function createJobOpeningAction(
  values: unknown
) {
  const parsed =
    createJobOpeningSchema.safeParse(values)

  if (!parsed.success) {
    return failureResult(
      parsed.error.issues[0]?.message ??
        "Dados inválidos para criar a vaga."
    )
  }

  try {
    const { companyId, user } =
      await getCurrentCompanyContext()

    const jobOpening =
      await createJobOpening({
        companyId,
        userId: user.id,
        values: parsed.data,
      })

    revalidatePath("/app/recruitment")

    return successResult(
      "Vaga criada com sucesso.",
      jobOpening
    )
  } catch (error) {
    console.error(
      "Erro ao criar vaga:",
      error
    )

    return failureResult(
      error instanceof Error
        ? error.message
        : "Não foi possível criar a vaga."
    )
  }
}
