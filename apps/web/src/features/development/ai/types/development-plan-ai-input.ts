export type DevelopmentPlanAiInput = {
  employeeName: string

  positionName: string

  competencyGaps: {
    competency: string

    currentLevel: number

    expectedLevel: number

    required: boolean
  }[]
}
