import type {
  CostAssumptions,
  CostImpactResult,
} from "./types"


type WorkforceInput = {
  currentHeadcount: number
  projectedHeadcount: number
}


type CalculateCostImpactInput = {
  workforce: WorkforceInput
  assumptions: CostAssumptions
}


export function calculateCostImpact({
  workforce,
  assumptions,
}: CalculateCostImpactInput): CostImpactResult {
  const employeesAdded = Math.max(
    workforce.projectedHeadcount -
      workforce.currentHeadcount,
    0
  )

  const employeesRemoved = Math.max(
    workforce.currentHeadcount -
      workforce.projectedHeadcount,
    0
  )

  const currentMonthlyCost =
    workforce.currentHeadcount *
    assumptions.averageEmployeeMonthlyCost

  const projectedMonthlyCost =
    workforce.projectedHeadcount *
    assumptions.averageEmployeeMonthlyCost

  const monthlyVariation =
    projectedMonthlyCost -
    currentMonthlyCost

  const hiringImpact =
    employeesAdded *
    assumptions.averageHiringCost

  const terminationImpact =
    employeesRemoved *
    assumptions.averageTerminationCost


  const status =
    monthlyVariation <= 0
      ? "healthy"
      : monthlyVariation >
          assumptions.averageEmployeeMonthlyCost *
            5
        ? "critical"
        : "attention"


  return Object.freeze({
    currentMonthlyCost,
    projectedMonthlyCost,
    monthlyVariation,

    employeesAdded,
    employeesRemoved,

    hiringImpact,
    terminationImpact,

    status,
  })
}
