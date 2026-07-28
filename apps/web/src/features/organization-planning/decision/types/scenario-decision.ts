import type {
  DecisionAction,
} from "./decision-action"
import type {
  DecisionConfidence,
} from "./decision-confidence"
import type {
  DecisionReason,
} from "./decision-reason"
import type {
  ScenarioRecommendation,
} from "./scenario-recommendation"

export type ScenarioDecision =
  Readonly<{
    scenarioId: string
    recommendation:
      ScenarioRecommendation
    confidence:
      DecisionConfidence
    reasons:
      readonly DecisionReason[]
    actions:
      readonly DecisionAction[]
    generatedAt: Date
  }>
