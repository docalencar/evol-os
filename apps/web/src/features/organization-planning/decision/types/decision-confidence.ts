export const DECISION_CONFIDENCE_LEVELS = [
  "low",
  "medium",
  "high",
  "very_high",
] as const

export type DecisionConfidenceLevel =
  (typeof DECISION_CONFIDENCE_LEVELS)[number]

export type DecisionConfidence =
  Readonly<{
    score: number
    level: DecisionConfidenceLevel
  }>
