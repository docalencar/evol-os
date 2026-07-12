export type DevelopmentMonthlyEvolutionItem = {
  month: string

  label: string

  createdPlans: number

  completedPlans: number
}

export type DevelopmentMonthlyEvolution =
  DevelopmentMonthlyEvolutionItem[]