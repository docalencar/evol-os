"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type PersistenceState = "pending" | "error"

type AssessmentAutosaveContextValue = {
  hasUnpersistedChanges: boolean
  markPending: (questionId: string) => void
  markPersisted: (questionId: string) => void
  markFailed: (questionId: string) => void
}

const AssessmentAutosaveContext =
  createContext<AssessmentAutosaveContextValue | null>(null)

export function AssessmentAutosaveProvider({
  children,
}: {
  children: ReactNode
}) {
  const [states, setStates] = useState<Record<string, PersistenceState>>({})

  const markPending = useCallback((questionId: string) => {
    setStates((current) => ({
      ...current,
      [questionId]: "pending",
    }))
  }, [])

  const markPersisted = useCallback((questionId: string) => {
    setStates((current) => {
      const next = { ...current }
      delete next[questionId]
      return next
    })
  }, [])

  const markFailed = useCallback((questionId: string) => {
    setStates((current) => ({
      ...current,
      [questionId]: "error",
    }))
  }, [])

  const value = useMemo(
    () => ({
      hasUnpersistedChanges: Object.keys(states).length > 0,
      markPending,
      markPersisted,
      markFailed,
    }),
    [markFailed, markPending, markPersisted, states]
  )

  return (
    <AssessmentAutosaveContext.Provider value={value}>
      {children}
    </AssessmentAutosaveContext.Provider>
  )
}

export function useAssessmentAutosaveCoordinator() {
  const context = useContext(AssessmentAutosaveContext)

  if (!context) {
    throw new Error(
      "Assessment autosave components require AssessmentAutosaveProvider."
    )
  }

  return context
}
