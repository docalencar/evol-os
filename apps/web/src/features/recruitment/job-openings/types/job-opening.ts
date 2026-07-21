export const JOB_OPENING_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "open",
  "paused",
  "closed",
  "cancelled",
  "filled",
] as const

export type JobOpeningStatus =
  (typeof JOB_OPENING_STATUSES)[number]

export const JOB_OPENING_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const

export type JobOpeningPriority =
  (typeof JOB_OPENING_PRIORITIES)[number]

export const JOB_OPENING_REASONS = [
  "replacement",
  "headcount_growth",
  "new_position",
  "temporary_demand",
  "internal_mobility",
  "other",
] as const

export type JobOpeningReason =
  (typeof JOB_OPENING_REASONS)[number]

export const JOB_OPENING_WORK_MODELS = [
  "on_site",
  "hybrid",
  "remote",
] as const

export type JobOpeningWorkModel =
  (typeof JOB_OPENING_WORK_MODELS)[number]

export const JOB_OPENING_EMPLOYMENT_TYPES = [
  "clt",
  "pj",
  "intern",
  "apprentice",
  "temporary",
  "outsourced",
  "contractor",
  "other",
] as const

export type JobOpeningEmploymentType =
  (typeof JOB_OPENING_EMPLOYMENT_TYPES)[number]

export type JobOpening = {
  id: string
  companyId: string
  title: string
  description: string
  departmentId: string
  positionId: string
  requestingManagerId: string
  recruiterId: string | null
  openingReason: JobOpeningReason
  replacedEmployeeId: string | null
  openingJustification: string
  positionsCount: number
  currentHeadcount: number
  targetHeadcount: number
  workModel: JobOpeningWorkModel
  location: string | null
  employmentType: JobOpeningEmploymentType
  salaryMin: number | null
  salaryMax: number | null
  status: JobOpeningStatus
  priority: JobOpeningPriority
  targetHireDate: string | null
  approverId: string | null
  approvedAt: string | null
  notes: string | null
  estimatedMonthlyCost: number | null
  isBudgeted: boolean
  createdByUserId: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}
