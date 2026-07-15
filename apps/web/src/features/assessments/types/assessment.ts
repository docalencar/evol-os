export type AssessmentStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "completed"
  | "cancelled"

export type Assessment = {
  id: string
  title: string
  description: string | null
  status: AssessmentStatus
  statusLabel: string
  typeLabel: string
  periodLabel: string
  startDate: string
  endDate: string
  templateId: string | null
  isAnonymous: boolean
  evaluatorFormats: string[]
}
