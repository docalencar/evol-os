export const SCENARIO_RECOMMENDATIONS = [
  "approve",
  "approve_with_attention",
  "request_revision",
  "reject",
] as const

export type ScenarioRecommendation =
  (typeof SCENARIO_RECOMMENDATIONS)[number]
