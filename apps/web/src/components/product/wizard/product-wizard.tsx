"use client"

import type { ReactNode } from "react"

import { cn } from "@/utils/cn"

import { ProductWizardProvider } from "./product-wizard-provider"
import type { ProductWizardStepDefinition } from "./types"

type ProductWizardProps = {
  steps: ProductWizardStepDefinition[]
  initialStepId?: string
  onComplete?: () => void
  children: ReactNode
  className?: string
}

export function ProductWizard({
  steps,
  initialStepId,
  onComplete,
  children,
  className,
}: ProductWizardProps) {
  return (
    <ProductWizardProvider
      steps={steps}
      initialStepId={initialStepId}
      onComplete={onComplete}
    >
      <div
        className={cn(
          "flex max-h-[85vh] min-h-0 flex-col overflow-hidden",
          className
        )}
      >
        {children}
      </div>
    </ProductWizardProvider>
  )
}
