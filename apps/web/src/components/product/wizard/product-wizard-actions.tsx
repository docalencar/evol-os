"use client"

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"

import { useProductWizard } from "./context"

type ProductWizardActionsProps = {
  cancelLabel?: string
  previousLabel?: string
  nextLabel?: string
  completeLabel?: string
  onCancel?: () => void
  onBeforeNext?: () =>
    | boolean
    | Promise<boolean>
  onBeforeComplete?: () =>
    | boolean
    | Promise<boolean>
  disabled?: boolean
  isPending?: boolean
}

export function ProductWizardActions({
  cancelLabel = "Cancelar",
  previousLabel = "Voltar",
  nextLabel = "Continuar",
  completeLabel = "Concluir",
  onCancel,
  onBeforeNext,
  onBeforeComplete,
  disabled = false,
  isPending = false,
}: ProductWizardActionsProps) {
  const {
    isFirstStep,
    isLastStep,
    goNext,
    goPrevious,
    completeCurrentStep,
  } = useProductWizard()

  async function handleNext() {
    const canContinue =
      (await onBeforeNext?.()) ?? true

    if (canContinue) {
      goNext()
    }
  }

  async function handleComplete() {
    const canComplete =
      (await onBeforeComplete?.()) ?? true

    if (canComplete) {
      completeCurrentStep()
    }
  }

  return (
    <>
      {onCancel ? (
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isPending}
          className="mr-auto"
        >
          {cancelLabel}
        </Button>
      ) : null}

      {!isFirstStep ? (
        <Button
          type="button"
          variant="outline"
          onClick={goPrevious}
          disabled={isPending}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          {previousLabel}
        </Button>
      ) : null}

      {isLastStep ? (
        <Button
          type="button"
          onClick={handleComplete}
          disabled={disabled || isPending}
        >
          {isPending
            ? "Salvando..."
            : completeLabel}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={handleNext}
          disabled={disabled || isPending}
        >
          {nextLabel}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </>
  )
}
