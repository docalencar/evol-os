import type { CompetencyGap } from "./competency-gap"

export type CompetencyCoverageState =
  | "no_position"
  | "not_configured"
  | "not_assessed"
  | "partially_assessed"
  | "assessed"

export type UnassessedCompetency = Readonly<{
  competencyId: string
  competencyName: string
  expectedLevel: number
}>

export type CompetencyCoverage = Readonly<{
  state: CompetencyCoverageState
  expectedCount: number
  assessedCount: number
  unassessedCount: number
  coverage: number | null
  gaps: readonly CompetencyGap[]
  unassessedCompetencies: readonly UnassessedCompetency[]
}>
