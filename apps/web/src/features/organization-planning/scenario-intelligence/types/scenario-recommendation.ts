export type ScenarioRecommendationType =
  | "approve"
  | "review"
  | "adjust"
  | "reject"

export type ScenarioRecommendation = Readonly<{
  type: ScenarioRecommendationType
  title: string
  description: string
  justification: string
}>
