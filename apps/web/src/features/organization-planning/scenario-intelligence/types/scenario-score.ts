export type ScenarioScoreLevel =
  | "low"
  | "moderate"
  | "high"

export type ScenarioScore = Readonly<{
  value: number
  level: ScenarioScoreLevel
  reasons: readonly string[]
}>
