import type {
  GenerateStructuredOutputResult,
} from "@/features/ai"

import type {
  DevelopmentPlanAiInput,
} from "../types/development-plan-ai-input"

import type {
  DevelopmentPlanAiOutput,
} from "../types/development-plan-ai-output"

import {
  createDevelopmentPlanMockAiProvider,
} from "./create-development-plan-mock-ai-provider"

import {
  generateDevelopmentPlanAiSuggestion,
} from "./generate-development-plan-ai-suggestion"

export async function generateMockDevelopmentPlanAiSuggestion(
  input: DevelopmentPlanAiInput
): Promise<
  GenerateStructuredOutputResult<DevelopmentPlanAiOutput>
> {
  const provider =
    createDevelopmentPlanMockAiProvider()

  return generateDevelopmentPlanAiSuggestion(
    provider,
    input
  )
}
