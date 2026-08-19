"use server"

import { revalidatePath } from "next/cache"

import {
  isValidSubmissionId,
  submissionIdFromInput,
} from "@/features/people-organization-mutations"

import { createCompetencyRepository } from "../repositories/competency-repository"
import { createCompetencySchema } from "../schemas/competency-schema"

export async function createCompetencyAction(
  companyId: string,
  input: unknown
) {
  // A create requires an explicit, stable per-submission identity so that a
  // retry of the SAME submission converges (idempotent_retry) while a genuinely
  // new submission gets a new key. The token is a selector only — the RPC still
  // authorizes via auth.uid()/membership. Reject before any RPC.
  const submissionId = submissionIdFromInput(input)
  if (!isValidSubmissionId(submissionId)) {
    return {
      success: false,
      message: "Dados inválidos.",
    }
  }

  const parsed = createCompetencySchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const repository = await createCompetencyRepository()

  const { error } = await repository.create(
    companyId,
    parsed.data,
    submissionId
  )

  if (error) {
    return {
      success: false,
      message: "Não foi possível cadastrar a competência.",
    }
  }

  revalidatePath("/app/competencies")

  return {
    success: true,
    message: "Competência criada com sucesso.",
  }
}

