"use client"

import { useEffect, useState } from "react"

import { saveAssessmentAnswerAction } from "../../actions/save-assessment-answer-action"
import type { AssessmentAnswer } from "../../types/assessment-answer"
import type { AssessmentQuestion } from "../../types/assessment-question"

type AssessmentQuestionCardProps = {
  companyId: string
  assessmentResponseId: string
  question: AssessmentQuestion
  answer?: AssessmentAnswer
}

export function AssessmentQuestionCard({
  companyId,
  assessmentResponseId,
  question,
  answer,
}: AssessmentQuestionCardProps) {
  const [selectedScore, setSelectedScore] = useState<number | null>(
    answer?.score ?? null
  )

  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")

  useEffect(() => {
    setSelectedScore(answer?.score ?? null)
  }, [answer])

  useEffect(() => {
    if (selectedScore === null) {
      return
    }

    setSaveState("saving")

    const timeout = setTimeout(async () => {
      const result = await saveAssessmentAnswerAction(
        companyId,
        {
          assessmentResponseId,
          assessmentQuestionId: question.id,
          score: selectedScore,
        }
      )

      setSaveState(
        result.success ? "saved" : "error"
      )
    }, 500)

    return () => clearTimeout(timeout)
  }, [
    companyId,
    assessmentResponseId,
    question.id,
    selectedScore,
  ])

  return (
    <div
      className={[
        "space-y-4 rounded-xl border p-5 transition-all duration-200",
        selectedScore !== null
          ? "border-primary bg-primary/5"
          : "border-border bg-background",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">
            {question.question}

            {question.required && (
              <span className="ml-1 text-destructive">*</span>
            )}
          </h3>

          {question.help_text && (
            <p className="mt-1 text-sm text-muted-foreground">
              {question.help_text}
            </p>
          )}
        </div>

        <div className="text-xs">
          {saveState === "saving" && (
            <span className="text-amber-600">
              Salvando...
            </span>
          )}

          {saveState === "saved" && (
            <span className="text-emerald-600">
              ✔ Salvo
            </span>
          )}

          {saveState === "error" && (
            <span className="text-red-600">
              Erro ao salvar
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from(
          {
            length:
              question.scale_max -
              question.scale_min +
              1,
          },
          (_, index) => question.scale_min + index
        ).map((value) => {
          const selected = value === selectedScore

          return (
            <button
              key={value}
              type="button"
              onClick={() => setSelectedScore(value)}
              className={[
                "flex h-10 w-10 items-center justify-center rounded-full border text-sm font-medium transition-all",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "hover:border-primary hover:bg-primary/10",
              ].join(" ")}
            >
              {value}
            </button>
          )
        })}
      </div>
    </div>
  )
}
