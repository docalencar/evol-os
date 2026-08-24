"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { useRouter } from "next/navigation"

import {
  saveAssessmentAnswerAction,
} from "../../../actions/save-assessment-answer-action"
import type {
  SaveAssessmentAnswerInput,
} from "../../../schemas/assessment-answer-schema"
import { useAssessmentAutosaveCoordinator } from "../assessment-autosave-context"

export type AssessmentAutoSaveState =
  | "idle"
  | "saving"
  | "saved"
  | "error"

type AssessmentAnswerPayload = Omit<
  SaveAssessmentAnswerInput,
  "assessmentResponseId" |
  "assessmentQuestionId"
>

type UseAssessmentAutoSaveInput = {
  companyId: string
  assessmentResponseId: string
  assessmentQuestionId: string
  disabled?: boolean
  delay?: number
}

export function useAssessmentAutoSave({
  companyId,
  assessmentResponseId,
  assessmentQuestionId,
  disabled = false,
  delay = 500,
}: UseAssessmentAutoSaveInput) {
  const router = useRouter()
  const {
    markFailed,
    markPending,
    markPersisted,
  } = useAssessmentAutosaveCoordinator()
  const [
    saveState,
    setSaveState,
  ] = useState<AssessmentAutoSaveState>(
    "idle"
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const timeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    )

  const requestSequenceRef = useRef(0)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())

  const clearPendingSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return clearPendingSave
  }, [clearPendingSave])

  const save = useCallback(
    (payload: AssessmentAnswerPayload) => {
      if (disabled) {
        return
      }

      clearPendingSave()
      setSaveState("saving")
      setErrorMessage(null)
      markPending(assessmentQuestionId)

      const requestSequence =
        requestSequenceRef.current + 1

      requestSequenceRef.current =
        requestSequence

      timeoutRef.current = setTimeout(() => {
        saveQueueRef.current = saveQueueRef.current.then(async () => {
          const result = await saveAssessmentAnswerAction(companyId, {
            assessmentResponseId,
            assessmentQuestionId,
            ...payload,
          })

          if (requestSequence !== requestSequenceRef.current) return

          setSaveState(result.success ? "saved" : "error")
          setErrorMessage(
            result.success ? null : result.message || "Erro ao salvar"
          )

          if (result.success) {
            markPersisted(assessmentQuestionId)
            router.refresh()
          } else {
            markFailed(assessmentQuestionId)
          }
        }).catch(() => {
          if (requestSequence !== requestSequenceRef.current) return
          setSaveState("error")
          setErrorMessage("Não foi possível salvar a resposta.")
          markFailed(assessmentQuestionId)
        })

        timeoutRef.current = null
      }, delay)
    },
    [
      assessmentQuestionId,
      assessmentResponseId,
      clearPendingSave,
      companyId,
      delay,
      disabled,
      markFailed,
      markPending,
      markPersisted,
      router,
    ]
  )

  return {
    save,
    saveState,
    errorMessage,
    markPending: () => markPending(assessmentQuestionId),
    markPersisted: () => markPersisted(assessmentQuestionId),
  }
}
