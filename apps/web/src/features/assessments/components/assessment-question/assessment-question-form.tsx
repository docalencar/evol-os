"use client"

import {
  useState,
  useTransition,
} from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  createAssessmentQuestionAction,
} from "../../actions/create-assessment-question-action"
import {
  updateAssessmentQuestionAction,
} from "../../actions/update-assessment-question-action"
import {
  assessmentQuestionTypeOptions,
} from "../../constants/assessment-question-options"
import type {
  AssessmentQuestion,
  AssessmentQuestionType,
} from "../../types/assessment-question"

type Props = {
  companyId: string
  assessmentSectionId: string
  question?: AssessmentQuestion
  defaultDisplayOrder?: number
  onSuccess?: () => void
}

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

const textareaClassName =
  "min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

function readNumber(
  value: FormDataEntryValue | null,
  fallback: number
) {
  if (typeof value !== "string") {
    return fallback
  }

  const normalizedValue = value
    .trim()
    .replace(",", ".")

  if (!normalizedValue) {
    return fallback
  }

  const parsedValue = Number(normalizedValue)

  return Number.isFinite(parsedValue)
    ? parsedValue
    : fallback
}

function getRangeValues(
  questionType: AssessmentQuestionType,
  formData: FormData
) {
  if (
    questionType === "yes_no" ||
    questionType === "text"
  ) {
    return {
      scaleMin: 0,
      scaleMax: 1,
    }
  }

  return {
    scaleMin: readNumber(
      formData.get("scaleMin"),
      1
    ),
    scaleMax: readNumber(
      formData.get("scaleMax"),
      5
    ),
  }
}

export function AssessmentQuestionForm({
  companyId,
  assessmentSectionId,
  question,
  defaultDisplayOrder = 1,
  onSuccess,
}: Props) {
  const [isPending, startTransition] =
    useTransition()

  const [
    questionType,
    setQuestionType,
  ] = useState<AssessmentQuestionType>(
    question?.question_type ?? "scale"
  )

  const showsRange =
    questionType === "scale" ||
    questionType === "number"

  function submit(formData: FormData) {
    const range = getRangeValues(
      questionType,
      formData
    )

    const input = {
      assessmentSectionId,
      code: String(
        formData.get("code") ?? ""
      ),
      question: String(
        formData.get("question") ?? ""
      ),
      helpText: String(
        formData.get("helpText") ?? ""
      ),
      questionType,
      scaleMin: range.scaleMin,
      scaleMax: range.scaleMax,
      weight: readNumber(
        formData.get("weight"),
        1
      ),
      displayOrder:
        question?.display_order ??
        defaultDisplayOrder,
      required:
        formData.get("required") === "on",
      active:
        formData.get("active") === "on",
    }

    startTransition(async () => {
      const result = question
        ? await updateAssessmentQuestionAction(
            companyId,
            question.id,
            input
          )
        : await createAssessmentQuestionAction(
            companyId,
            input
          )

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      onSuccess?.()
    })
  }

  return (
    <form
      action={submit}
      className="space-y-5"
    >
      <div className="space-y-2">
        <Label htmlFor="question">
          Pergunta
        </Label>

        <Input
          id="question"
          name="question"
          defaultValue={
            question?.question ?? ""
          }
          placeholder="Digite a pergunta que será apresentada ao avaliador."
          minLength={5}
          maxLength={500}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="helpText">
          Texto de ajuda
        </Label>

        <textarea
          id="helpText"
          name="helpText"
          defaultValue={
            question?.help_text ?? ""
          }
          className={textareaClassName}
          placeholder="Explique como a pergunta deve ser interpretada."
          maxLength={1000}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="questionType">
            Tipo de resposta
          </Label>

          <select
            id="questionType"
            name="questionType"
            value={questionType}
            onChange={(event) => {
              setQuestionType(
                event.target
                  .value as AssessmentQuestionType
              )
            }}
            className={selectClassName}
          >
            {assessmentQuestionTypeOptions.map(
              (option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              )
            )}
          </select>

          <p className="text-xs leading-5 text-muted-foreground">
            {questionType === "scale"
              ? "O avaliador escolherá uma nota dentro da escala definida."
              : questionType === "yes_no"
                ? "O avaliador escolherá entre Sim e Não."
                : questionType === "text"
                  ? "O avaliador responderá livremente em texto."
                  : "O avaliador informará um valor numérico."}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="weight">
            Peso
          </Label>

          <Input
            id="weight"
            name="weight"
            type="number"
            min="0.01"
            max="100"
            step="0.01"
            defaultValue={
              question?.weight ?? 1
            }
            required
          />

          <p className="text-xs leading-5 text-muted-foreground">
            Use 1 para peso padrão. Valores maiores
            aumentam a influência da pergunta no resultado.
          </p>
        </div>
      </div>

      {showsRange ? (
        <div
          key={questionType}
          className="grid gap-4 rounded-md border p-4 md:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="scaleMin">
              {questionType === "scale"
                ? "Nota mínima"
                : "Valor mínimo"}
            </Label>

            <Input
              id="scaleMin"
              name="scaleMin"
              type="number"
              defaultValue={
                questionType ===
                  question?.question_type
                  ? question.scale_min
                  : 1
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scaleMax">
              {questionType === "scale"
                ? "Nota máxima"
                : "Valor máximo"}
            </Label>

            <Input
              id="scaleMax"
              name="scaleMax"
              type="number"
              defaultValue={
                questionType ===
                  question?.question_type
                  ? question.scale_max
                  : 5
              }
              required
            />
          </div>

          <p className="text-xs leading-5 text-muted-foreground md:col-span-2">
            O valor máximo deve ser maior que o
            valor mínimo.
          </p>
        </div>
      ) : null}

      <div className="space-y-3 rounded-md border p-4">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="required"
            defaultChecked={
              question?.required ?? true
            }
            className="h-4 w-4 rounded border-input"
          />

          Resposta obrigatória
        </label>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="active"
            defaultChecked={
              question?.active ?? true
            }
            className="h-4 w-4 rounded border-input"
          />

          Pergunta ativa
        </label>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? "Salvando..."
            : question
              ? "Salvar alterações"
              : "Criar pergunta"}
        </Button>
      </div>
    </form>
  )
}
