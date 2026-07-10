import type {
  CompetencyGap,
  CompetencyGapInput,
  CompetencyGapStatus,
} from "../types/competency-gap"

function getGapStatus(gap: number): CompetencyGapStatus {
  if (gap > 0) {
    return "strength"
  }

  if (gap === 0) {
    return "matched"
  }

  if (gap === -1) {
    return "attention"
  }

  return "critical"
}

export function calculateCompetencyGap(
  input: CompetencyGapInput
): CompetencyGap {
  const gap = input.currentLevel - input.expectedLevel

  return {
    competencyId: input.competencyId,
    competencyName: input.competencyName,
    currentLevel: input.currentLevel,
    expectedLevel: input.expectedLevel,
    gap,
    weight: input.weight,
    required: input.required,
    status: getGapStatus(gap),
  }
}