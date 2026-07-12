import type {
  AiProvider,
  GenerateStructuredOutputResult,
} from "@/features/ai"

import {
  generateDevelopmentPlanAiSuggestion,
} from "../ai"

import type {
  DevelopmentPlanAiInput,
} from "../ai"

import type {
  DevelopmentPlanAiOutput,
} from "../ai"

export async function generateDevelopmentPlanSuggestion(
  provider: AiProvider,
  input: DevelopmentPlanAiInput
): Promise<
  GenerateStructuredOutputResult<DevelopmentPlanAiOutput>
> {
  return generateDevelopmentPlanAiSuggestion(
    provider,
    input
  )
}
