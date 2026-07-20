import type { ReactNode } from "react"

export type ProductWizardStepDefinition = {
  id: string
  title: string
  description?: string
}

export type ProductWizardContextValue = {
  steps: ProductWizardStepDefinition[]
  currentStepId: string
  currentStepIndex: number
  completedStepIds: string[]
  isFirstStep: boolean
  isLastStep: boolean
  goToStep: (stepId: string) => void
  goNext: () => void
  goPrevious: () => void
  completeCurrentStep: () => void
  isStepActive: (stepId: string) => boolean
  isStepCompleted: (stepId: string) => boolean
  canOpenStep: (stepId: string) => boolean
}

export type ProductWizardProviderProps = {
  steps: ProductWizardStepDefinition[]
  initialStepId?: string
  onComplete?: () => void
  children: ReactNode
}
