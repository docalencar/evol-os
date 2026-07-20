export type AssessmentScoreDistributionItem = {
  score: number
  count: number
  percentage: number
}

export type AssessmentStatistics = {
  answersCount: number
  scoredAnswersCount: number
  average: number | null
  minimum: number | null
  maximum: number | null
  standardDeviation: number | null
  distribution: AssessmentScoreDistributionItem[]
}
