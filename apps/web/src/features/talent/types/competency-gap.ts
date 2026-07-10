export type CompetencyGapStatus =
  | "strength"
  | "matched"
  | "attention"
  | "critical"

export type CompetencyGapInput = {
  competencyId: string
  competencyName: string
  currentLevel: number
  expectedLevel: number
  weight: number
  required: boolean
}

export type CompetencyGap = {
  competencyId: string
  competencyName: string

  currentLevel: number
  expectedLevel: number
  gap: number

  weight: number
  required: boolean

  status: CompetencyGapStatus
}
