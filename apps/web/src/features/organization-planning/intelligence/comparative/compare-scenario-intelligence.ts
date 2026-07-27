import type {
  ScenarioIntelligence,
  MetricDelta,
} from "../types"

import type {
  ScenarioComparison,
  ScenarioMetricComparison,
} from "./types"


function compareMetric(
  first: MetricDelta,
  second: MetricDelta
): ScenarioMetricComparison {
  return Object.freeze({
    first,
    second,
    difference:
      second.projected -
      first.projected,
  })
}


function calculateRecommendation(
  first:
    ScenarioIntelligence,
  second:
    ScenarioIntelligence
):
  ScenarioComparison["recommendation"] {

  const firstCost =
    first.financial.salaryMass.projected

  const secondCost =
    second.financial.salaryMass.projected


  if (firstCost < secondCost) {
    return "first"
  }


  if (secondCost < firstCost) {
    return "second"
  }


  return "neutral"
}


function createSummary(
  recommendation:
    ScenarioComparison["recommendation"]
): string {

  switch (recommendation) {
    case "first":
      return "O primeiro cenário apresenta melhor eficiência financeira."

    case "second":
      return "O segundo cenário apresenta melhor eficiência financeira."

    default:
      return "Os cenários apresentam equilíbrio financeiro."
  }
}


export function compareScenarioIntelligence(
  first:
    ScenarioIntelligence,
  second:
    ScenarioIntelligence
): ScenarioComparison {

  const recommendation =
    calculateRecommendation(
      first,
      second
    )


  return Object.freeze({
    firstScenarioId:
      first.scenarioId,

    secondScenarioId:
      second.scenarioId,

    firstProjectionId:
      first.projectionId,

    secondProjectionId:
      second.projectionId,


    metrics:
      Object.freeze({
        headcount:
          compareMetric(
            first.workforce.headcount,
            second.workforce.headcount
          ),

        vacancies:
          compareMetric(
            first.vacancies.vacancies,
            second.vacancies.vacancies
          ),

        salaryMass:
          compareMetric(
            first.financial.salaryMass,
            second.financial.salaryMass
          ),

        departments:
          compareMetric(
            first.organization.departments,
            second.organization.departments
          ),

        positions:
          compareMetric(
            first.organization.positions,
            second.organization.positions
          ),
      }),


    recommendation,

    summary:
      createSummary(
        recommendation
      ),
  })
}
