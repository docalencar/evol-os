"use server"

import {
  failureResult,
  successResult,
} from "@/lib/actions"

import {
  generateDevelopmentPlanSuggestion,
} from "../application/generate-development-plan-suggestion"

import {
  createDevelopmentPlanMockAiProvider,
  developmentPlanAiInputSchema,
} from "../ai"

export async function generateDevelopmentPlanSuggestionAction(
  values: unknown
) {
  const parsed =
    developmentPlanAiInputSchema.safeParse(
      values
    )

  if (!parsed.success) {
    return failureResult(
      parsed.error.issues[0]?.message ??
        "Dados inválidos para gerar a sugestão."
    )
  }

  try {
    const provider =
      createDevelopmentPlanMockAiProvider()

    const result =
      await generateDevelopmentPlanSuggestion(
        provider,
        parsed.data
      )

    return successResult(
      "Sugestão de PDI gerada com sucesso.",
      result.output
    )
  } catch (error) {
    console.error(
      "Erro ao gerar sugestão de PDI:",
      error
    )

    return failureResult(
      error instanceof Error
        ? error.message
        : "Não foi possível gerar a sugestão de PDI."
    )
  }
}
