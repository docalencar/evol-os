"use client"

import {
  useCallback,
  useMemo,
  useState,
} from "react"

import { ProductWizardContext } from "./context"
import type {
  ProductWizardContextValue,
  ProductWizardProviderProps,
} from "./types"

export function ProductWizardProvider({
  steps,
  initialStepId,
  onComplete,
  children,
}: ProductWizardProviderProps) {
  const initialStepIndex = Math.max(
    steps.findIndex(
      (step) => step.id === initialStepId
    ),
    0
  )

  const [currentStepIndex, setCurrentStepIndex] =
    useState(initialStepIndex)

  const [
    completedStepIds,
    setCompletedStepIds,
  ] = useState<string[]>([])

  const currentStep =
    steps[currentStepIndex] ?? steps[0]

  const currentStepId =
    currentStep?.id ?? ""

  const markStepAsCompleted = useCallback(
    (stepId: string) => {
      setCompletedStepIds((current) =>
        current.includes(stepId)
          ? current
          : [...current, stepId]
      )
    },
    []
  )

  const isStepCompleted = useCallback(
    (stepId: string) =>
      completedStepIds.includes(stepId),
    [completedStepIds]
  )

  const isStepActive = useCallback(
    (stepId: string) =>
      currentStepId === stepId,
    [currentStepId]
  )

  const canOpenStep = useCallback(
    (stepId: string) => {
      const stepIndex = steps.findIndex(
        (step) => step.id === stepId
      )

      return (
        stepIndex === currentStepIndex ||
        stepIndex < currentStepIndex ||
        completedStepIds.includes(stepId)
      )
    },
    [
      completedStepIds,
      currentStepIndex,
      steps,
    ]
  )

  const goToStep = useCallback(
    (stepId: string) => {
      const stepIndex = steps.findIndex(
        (step) => step.id === stepId
      )

      if (
        stepIndex < 0 ||
        !canOpenStep(stepId)
      ) {
        return
      }

      setCurrentStepIndex(stepIndex)
    },
    [canOpenStep, steps]
  )

  const goNext = useCallback(() => {
    if (!currentStep) {
      return
    }

    markStepAsCompleted(currentStep.id)

    setCurrentStepIndex((current) =>
      Math.min(
        current + 1,
        Math.max(steps.length - 1, 0)
      )
    )
  }, [
    currentStep,
    markStepAsCompleted,
    steps.length,
  ])

  const goPrevious = useCallback(() => {
    setCurrentStepIndex((current) =>
      Math.max(current - 1, 0)
    )
  }, [])

  const completeCurrentStep =
    useCallback(() => {
      if (!currentStep) {
        return
      }

      markStepAsCompleted(currentStep.id)
      onComplete?.()
    }, [
      currentStep,
      markStepAsCompleted,
      onComplete,
    ])

  const value =
    useMemo<ProductWizardContextValue>(
      () => ({
        steps,
        currentStepId,
        currentStepIndex,
        completedStepIds,
        isFirstStep: currentStepIndex === 0,
        isLastStep:
          currentStepIndex ===
          Math.max(steps.length - 1, 0),
        goToStep,
        goNext,
        goPrevious,
        completeCurrentStep,
        isStepActive,
        isStepCompleted,
        canOpenStep,
      }),
      [
        steps,
        currentStepId,
        currentStepIndex,
        completedStepIds,
        goToStep,
        goNext,
        goPrevious,
        completeCurrentStep,
        isStepActive,
        isStepCompleted,
        canOpenStep,
      ]
    )

  return (
    <ProductWizardContext.Provider
      value={value}
    >
      {children}
    </ProductWizardContext.Provider>
  )
}
