import {
  renderAiInstruction,
  type AiProvider,
  type GenerateStructuredOutputResult,
} from "@/features/ai"

import {
  developmentPlanAiOutputSchema,
} from "../schemas/development-plan-ai-output-schema"

import type {
  DevelopmentPlanAiInput,
} from "../types/development-plan-ai-input"

import type {
  DevelopmentPlanAiOutput,
} from "../types/development-plan-ai-output"

import {
  toDevelopmentPlanAiInstruction,
} from "./to-development-plan-ai-instruction"

export async function generateDevelopmentPlanAiSuggestion(
  provider: AiProvider,
  input: DevelopmentPlanAiInput
): Promise<
  GenerateStructuredOutputResult<DevelopmentPlanAiOutput>
> {
  const instruction =
    toDevelopmentPlanAiInstruction(
      input
    )

  const prompt =
    renderAiInstruction(
      instruction
    )

  return provider.generateStructuredOutput({
    messages: [
      {
        role: "system",
        content:
          "Você é um especialista em desenvolvimento de pessoas e Planos de Desenvolvimento Individual.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],

    schema:
      developmentPlanAiOutputSchema,

    schemaName:
      "development_plan_suggestion",

    temperature: 0.3,
  })
}
