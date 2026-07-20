import type { AssessmentStatistics } from "../types/assessment-statistics"

export type AssessmentStatisticCard = {
  label: string
  value: string
  description?: string
}

export type AssessmentStatisticsViewModel = {
  cards: AssessmentStatisticCard[]
  distribution: AssessmentStatistics["distribution"]
}

function format(value: number | null) {
  return value === null ? "-" : value.toFixed(2)
}

export function presentAssessmentStatistics(
  statistics: AssessmentStatistics
): AssessmentStatisticsViewModel {
  return {
    cards: [
      {
        label: "Média",
        value: format(statistics.average),
      },
      {
        label: "Maior nota",
        value: format(statistics.maximum),
      },
      {
        label: "Menor nota",
        value: format(statistics.minimum),
      },
      {
        label: "Desvio padrão",
        value: format(statistics.standardDeviation),
      },
      {
        label: "Respostas",
        value: String(statistics.scoredAnswersCount),
      },
    ],

    distribution: statistics.distribution,
  }
}
