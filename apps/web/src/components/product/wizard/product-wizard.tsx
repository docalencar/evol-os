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
          // Fill a bounded flex parent (e.g. the dialog body) via flex so the
          // step content scrolls internally and the footer stays reachable; on
          // an unbounded page it sizes to content and the page scrolls normally.
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          className
        )}
      >
        {children}
      </div>
    </ProductWizardProvider>
  )
}
