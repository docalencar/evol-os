import type { PersonCompetencyAssignmentState } from "@/features/competencies/person-competency-gaps/types/person-competency-gap"

export type DashboardCompetencyStatus =
  | "deficiency"
  | "meets"
  | "exceeds"
  | "unassessed"

export type DashboardCompetencyDevelopmentItem = Readonly<{
  personId: string
  personName: string
  competencyId: string
  competencyName: string
  expectedLevel: number
  currentLevel: number | null
  gap: number | null
  status: DashboardCompetencyStatus
}>

export type DashboardPersonCompetencySummary = Readonly<{
  personId: string
  personName: string
  assignmentState: PersonCompetencyAssignmentState
  assessed: number
  unassessed: number
  deficiencies: number
  meets: number
  exceeds: number
}>

export type DashboardCompetencyDevelopment = Readonly<{
  assessed: number
  unassessed: number
  deficiencies: number
  meets: number
  exceeds: number
  people: readonly DashboardPersonCompetencySummary[]
  priorities: readonly DashboardCompetencyDevelopmentItem[]
}>
