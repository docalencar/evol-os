"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  saveAssessmentAnswerAction,
} from "../../../actions/save-assessment-answer-action"
import type {
  SaveAssessmentAnswerInput,
} from "../../../schemas/assessment-answer-schema"

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
  const [
    saveState,
    setSaveState,
  ] = useState<AssessmentAutoSaveState>(
    "idle"
  )

  const timeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    )

  const requestSequenceRef = useRef(0)

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

      const requestSequence =
        requestSequenceRef.current + 1

      requestSequenceRef.current =
        requestSequence

      timeoutRef.current = setTimeout(
        async () => {
          const result =
            await saveAssessmentAnswerAction(
              companyId,
              {
                assessmentResponseId,
                assessmentQuestionId,
                ...payload,
              }
            )

          if (
            requestSequence !==
            requestSequenceRef.current
          ) {
            return
          }

          setSaveState(
            result.success
              ? "saved"
              : "error"
          )

          timeoutRef.current = null
        },
        delay
      )
    },
    [
      assessmentQuestionId,
      assessmentResponseId,
      clearPendingSave,
      companyId,
      delay,
      disabled,
    ]
  )

  return {
    save,
    saveState,
  }
}
