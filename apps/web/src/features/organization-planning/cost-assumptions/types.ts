export type CostAssumptions = Readonly<{
  id: string
  companyId: string

  averageEmployeeMonthlyCost: number
  averageHiringCost: number
  averageTerminationCost: number

  currency: string

  createdAt: string
  updatedAt: string
}>
