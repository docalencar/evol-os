"use client"

import {
  useRef,
  useState,
} from "react"

import type {
  AssessmentAnswer,
} from "../../types/assessment-answer"
import type {
  AssessmentQuestion,
} from "../../types/assessment-question"
import {
  useAssessmentAutoSave,
} from "./hooks/use-assessment-auto-save"
import {
  BooleanQuestionRenderer,
} from "./renderers/boolean-question-renderer"
import {
  NumberQuestionRenderer,
} from "./renderers/number-question-renderer"
import {
  ScaleQuestionRenderer,
} from "./renderers/scale-question-renderer"
import {
  TextQuestionRenderer,
} from "./renderers/text-question-renderer"

type AssessmentQuestionCardProps = {
  companyId: string
  assessmentResponseId: string
  question: AssessmentQuestion
  answer?: AssessmentAnswer
  readOnly?: boolean
}

export function AssessmentQuestionCard({
  companyId,
  assessmentResponseId,
  question,
  answer,
  readOnly = false,
}: AssessmentQuestionCardProps) {
  const [
    selectedScore,
    setSelectedScore,
  ] = useState<number | null>(
    answer?.score ?? null
  )

  const [
    selectedBoolean,
    setSelectedBoolean,
  ] = useState<boolean | null>(
    answer?.answer_boolean ?? null
  )

  const [
    textValue,
    setTextValue,
  ] = useState(
    answer?.answer_text ?? ""
  )

  const [
    textDirty,
    setTextDirty,
  ] = useState(false)

  const [
    numberValue,
    setNumberValue,
  ] = useState<number | null>(
    answer?.answer_number ?? null
  )

  const lastSavedTextRef = useRef(
    answer?.answer_text ?? ""
  )

  const {
    save,
    saveState,
  } = useAssessmentAutoSave({
    companyId,
    assessmentResponseId,
    assessmentQuestionId: question.id,
    disabled: readOnly,
  })

  const hasAnswer =
    question.question_type === "scale"
      ? selectedScore !== null
      : question.question_type === "yes_no"
        ? selectedBoolean !== null
        : question.question_type === "text"
          ? textValue.trim().length > 0
          : numberValue !== null

  function handleScaleChange(value: number) {
    setSelectedScore(value)

    save({
      score: value,
    })
  }

  function handleBooleanChange(
    value: boolean
  ) {
    setSelectedBoolean(value)

    save({
      answerBoolean: value,
    })
  }

  function handleTextChange(value: string) {
    setTextValue(value)

    setTextDirty(
      value !== lastSavedTextRef.current
    )
  }

  function handleTextBlur() {
    const normalizedText =
      textValue.trim()

    if (
      readOnly ||
      !textDirty ||
      !normalizedText
    ) {
      return
    }

    lastSavedTextRef.current =
      textValue

    setTextDirty(false)

    save({
      answerText: textValue,
    })
  }

  function handleNumberChange(
    value: number | null
  ) {
    setNumberValue(value)

    if (value === null) {
      return
    }

    save({
      answerNumber: value,
    })
  }

  function renderQuestion() {
    switch (question.question_type) {
      case "scale":
        return (
          <ScaleQuestionRenderer
            value={selectedScore}
            min={question.scale_min}
            max={question.scale_max}
            disabled={readOnly}
            onChange={handleScaleChange}
          />
        )

      case "yes_no":
        return (
          <BooleanQuestionRenderer
            value={selectedBoolean}
            disabled={readOnly}
            onChange={handleBooleanChange}
          />
        )

      case "text":
        return (
          <TextQuestionRenderer
            value={textValue}
            disabled={readOnly}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
          />
        )

      case "number":
        return (
          <NumberQuestionRenderer
            value={numberValue}
            min={question.scale_min}
            max={question.scale_max}
            disabled={readOnly}
            onChange={handleNumberChange}
          />
        )
    }
  }

  const showUnsavedTextState =
    question.question_type === "text" &&
    textDirty

  return (
    <div
      className={[
        "space-y-4 rounded-xl border p-5 transition-all duration-200",
        hasAnswer
          ? "border-primary bg-primary/5"
          : "border-border bg-background",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">
            {question.question}

            {question.required ? (
              <span className="ml-1 text-destructive">
                *
              </span>
            ) : null}
          </h3>

          {question.help_text ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {question.help_text}
            </p>
          ) : null}
        </div>

        <div
          aria-live="polite"
          className="min-w-32 text-right text-xs"
        >
          {showUnsavedTextState ? (
            <span className="text-amber-600">
              Alterações não salvas
            </span>
          ) : null}

          {!showUnsavedTextState &&
          saveState === "saving" ? (
            <span className="text-amber-600">
              Salvando...
            </span>
          ) : null}

          {!showUnsavedTextState &&
          saveState === "saved" ? (
            <span className="text-emerald-600">
              ✔ Salvo
            </span>
          ) : null}

          {!showUnsavedTextState &&
          saveState === "error" ? (
            <span className="text-red-600">
              Erro ao salvar
            </span>
          ) : null}
        </div>
      </div>

      {renderQuestion()}

      {question.question_type === "text" &&
      !readOnly ? (
        <p className="text-xs text-muted-foreground">
          A resposta será salva quando você sair
          deste campo.
        </p>
      ) : null}
    </div>
  )
}
