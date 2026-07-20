import type { AssessmentAnswer } from "../types/assessment-answer"
import type { AssessmentStatistics } from "../types/assessment-statistics"

import { calculateAverage } from "./calculate-average"
import { calculateScoreDistribution } from "./calculate-score-distribution"
import { calculateStandardDeviation } from "./calculate-standard-deviation"

function round(value: number): number {
  return Number(value.toFixed(2))
}

export function calculateAssessmentStatistics(
  answers: readonly AssessmentAnswer[]
): AssessmentStatistics {
  const scores = answers
    .map((answer) => answer.score)
    .filter((score): score is number => score !== null)

  const average = calculateAverage(scores)
  const standardDeviation =
    calculateStandardDeviation(scores)

  return {
    answersCount: answers.length,

    scoredAnswersCount: scores.length,

    average:
      average === null
        ? null
        : round(average),

    minimum:
      scores.length === 0
        ? null
        : Math.min(...scores),

    maximum:
      scores.length === 0
        ? null
        : Math.max(...scores),

    standardDeviation:
      standardDeviation === null
        ? null
        : round(standardDeviation),

    distribution:
      calculateScoreDistribution(scores).map(
        (item) => ({
          ...item,
          percentage: round(item.percentage),
        })
      ),
  }
}
