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

/**
 * Competency intelligence is company-wide and ADMINISTRATIVE.
 *
 * It is derived from `get_tenant_company_person_competency_expectations_v1`
 * (0124), which serves `owner`, `admin` and `hr` and refuses everyone else with
 * `42501 COMPANY_PERSON_COMPETENCY_EXPECTATIONS_FORBIDDEN`. That boundary is
 * correct and stays exactly as it is.
 *
 * What was not correct was the surface: `/app` is reachable by every active
 * member, and it asked for this intelligence unconditionally. A `manager` or an
 * `employee` therefore got the raised exception, and with no error boundary in
 * the segment the whole authenticated shell was replaced by Next's global
 * application error — the failure hosted run 260910235625-3e0d24 recorded on the
 * first non-administrative login the suite ever performed.
 *
 * So the absence is now MODELLED rather than thrown. This union exists to keep
 * "you are not allowed to see this" distinct from "there is nothing to see":
 * collapsing the first into an empty dataset would render four confident zeros
 * and tell a manager their company has no competency gaps, which is a lie the
 * type system can prevent.
 */
export type DashboardCompetencyIntelligence =
  | Readonly<{ status: "forbidden" }>
  | Readonly<{ status: "ok"; development: DashboardCompetencyDevelopment }>
