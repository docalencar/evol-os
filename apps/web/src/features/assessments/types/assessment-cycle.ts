export const ASSESSMENT_CYCLE_TYPES = [
  "performance",
  "competency",
  "experience",
  "probation",
  "360",
  "custom",
] as const

export type AssessmentCycleType =
  (typeof ASSESSMENT_CYCLE_TYPES)[number]

export const ASSESSMENT_CYCLE_STATUSES = [
  "draft",
  "scheduled",
  "active",
  "completed",
  "cancelled",
] as const

export type AssessmentCycleStatus =
  (typeof ASSESSMENT_CYCLE_STATUSES)[number]

export type AssessmentCycle = {
  id: string
  company_id: string

  name: string
  description: string | null

  assessment_type: AssessmentCycleType
  status: AssessmentCycleStatus

  start_date: string
  end_date: string
  close_date: string | null

  allow_self_assessment: boolean
  allow_manager_assessment: boolean
  allow_peer_assessment: boolean
  allow_direct_report_assessment: boolean

  anonymous: boolean

  created_at: string
  updated_at: string
  deleted_at: string | null
}