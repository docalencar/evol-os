import type {
  DevelopmentPlanIntentInput,
  DevelopmentTemplateApplicationResolutionInput,
  TemplateApplicationIdentityInput,
} from "../resolver"

export type DevelopmentTemplateApplicationIntent = Readonly<{
  identity: TemplateApplicationIdentityInput
  intent: DevelopmentPlanIntentInput
  templateVersionId: string
}>

export type DevelopmentTemplateApplicationResolutionData = Omit<
  DevelopmentTemplateApplicationResolutionInput,
  "identity" | "intent"
>

export interface DevelopmentTemplateApplicationResolutionRepository {
  load(
    intent: DevelopmentTemplateApplicationIntent,
  ): Promise<DevelopmentTemplateApplicationResolutionData>
}
