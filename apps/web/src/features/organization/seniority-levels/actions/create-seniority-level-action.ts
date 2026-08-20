"use server"

import { revalidatePath } from "next/cache"

import {
  isValidSubmissionId,
  submissionIdFromInput,
} from "@/features/people-organization-mutations"

import { publicSeniorityLevelMessage } from "../errors"
import { createSeniorityLevelRepository } from "../repositories/seniority-level-repository"
import { createSeniorityLevelSchema } from "../schemas/seniority-level-schema"

export async function createSeniorityLevelAction(
  companyId: string,
  input: unknown
) {
  // A create requires a stable per-submission identity so a retry of the SAME
  // submission converges (idempotent_retry) and a new submission gets a new key.
  // The token is a selector only — the RPC authorizes via auth.uid()/membership.
  const submissionId = submissionIdFromInput(input)
  if (!isValidSubmissionId(submissionId)) {
    return { success: false, message: "Dados inválidos." }
  }

  const parsed = createSeniorityLevelSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    }
  }

  const repository = await createSeniorityLevelRepository()
  const { error } = await repository.create(
    companyId,
    parsed.data,
    submissionId
  )

  if (error) {
    return {
      success: false,
      message: publicSeniorityLevelMessage(
        error,
        "Não foi possível criar a senioridade."
      ),
    }
  }

  revalidatePath("/app/company/seniority")

  return { success: true, message: "Senioridade criada com sucesso." }
}
