"use client"

import { useProductWizard } from "./context"

type ProductWizardProgressProps = {
  className?: string
}

export function ProductWizardProgress({
  className,
}: ProductWizardProgressProps) {
  const {
    steps,
    currentStepIndex,
    completedStepIds,
  } = useProductWizard()

  const progress =
    steps.length === 0
      ? 0
      : (completedStepIds.length /
          steps.length) *
        100

  const percentage =
    steps.length === 0
      ? 0
      : ((currentStepIndex + 1) / steps.length) * 100

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>
          Etapa{" "}
          {Math.min(
            currentStepIndex + 1,
            steps.length
          )}{" "}
          de {steps.length}
        </span>

        <span>
          {completedStepIds.length} concluída
          {completedStepIds.length === 1
            ? ""
            : "s"}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
