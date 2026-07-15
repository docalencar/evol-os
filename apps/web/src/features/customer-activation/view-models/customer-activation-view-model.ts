export type CustomerActivationStepStatus =
  | "completed"
  | "pending"

export type CustomerActivationStepViewModel = {
  id: "company" | "employees" | "departments" | "positions"
  title: string
  description: string
  status: CustomerActivationStepStatus
}

export type CustomerActivationNextActionViewModel = {
  label: string
  href: string
} | null

export type CustomerActivationMetricsViewModel = {
  employees: number
  departments: number
  positions: number
}

export type CustomerActivationViewModel = {
  companyName: string
  progress: number
  completedSteps: number
  totalSteps: number
  isComplete: boolean
  steps: CustomerActivationStepViewModel[]
  nextAction: CustomerActivationNextActionViewModel
  metrics: CustomerActivationMetricsViewModel
}
