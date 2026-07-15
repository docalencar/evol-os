import type {
  AssessmentCycleStatus,
} from "../types/assessment-cycle"

import type {
  AssessmentStatus,
} from "../types/assessment"

export type AssessmentViewModel = {
  id: string
  title: string
  description: string | null
  status: AssessmentCycleStatus
  statusLabel: string
  typeLabel: string
  periodLabel: string
  startDate: string
  endDate: string
  templateId: string | null
  isAnonymous: boolean
  evaluatorFormats: string[]
}

export type AssessmentSummaryViewModel = {
  total: number
  draft: number
  scheduled: number
  active: number
  completed: number
  cancelled: number
}

export type AssessmentStatusViewModel = {
  value: AssessmentStatus
  label: string
}
