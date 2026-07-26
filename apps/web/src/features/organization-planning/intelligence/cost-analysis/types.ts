export type CostImpactStatus =
  | "healthy"
  | "attention"
  | "critical"


export type CostAssumptions = Readonly<{
  averageEmployeeMonthlyCost: number
  averageHiringCost: number
  averageTerminationCost: number
}>


export type CostImpactResult = Readonly<{
  currentMonthlyCost: number
  projectedMonthlyCost: number
  monthlyVariation: number

  employeesAdded: number
  employeesRemoved: number

  hiringImpact: number
  terminationImpact: number

  status: CostImpactStatus
}>
