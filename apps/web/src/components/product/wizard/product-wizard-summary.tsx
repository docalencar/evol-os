import type { ReactNode } from "react"

import { cn } from "@/utils/cn"

type ProductWizardSummaryProps = {
  children: ReactNode
  className?: string
}

export function ProductWizardSummary({
  children,
  className,
}: ProductWizardSummaryProps) {
  return (
    <div
      className={cn(
        "text-sm text-muted-foreground",
        className
      )}
    >
      {children}
    </div>
  )
}
