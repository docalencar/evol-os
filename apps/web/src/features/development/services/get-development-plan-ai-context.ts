import type {
  CompetencyGap,
} from "@/features/talent"

import type {
  DevelopmentPlanAiInput,
} from "../ai"

type GetDevelopmentPlanAiContextInput = {
  employeeName: string

  positionName: string

  competencyGaps: CompetencyGap[]
}

export function getDevelopmentPlanAiContext({
  employeeName,
  positionName,
  competencyGaps,
}: GetDevelopmentPlanAiContextInput): DevelopmentPlanAiInput {
  return {
    employeeName,

    positionName,

    competencyGaps: competencyGaps
      .filter(
        (gap) => gap.gap < 0
      )
      .map((gap) => ({
        competency:
          gap.competencyName,

        currentLevel:
          gap.currentLevel,

        expectedLevel:
          gap.expectedLevel,

        required:
          gap.required,
      })),
  }
}
