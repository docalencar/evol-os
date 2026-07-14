"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createAssessmentQuestionAction } from "../../actions/create-assessment-question-action"
import { updateAssessmentQuestionAction } from "../../actions/update-assessment-question-action"
import { assessmentQuestionTypeOptions } from "../../constants/assessment-question-options"
import type { AssessmentQuestion } from "../../types/assessment-question"

type Props = {
  companyId: string
  assessmentSectionId: string
  question?: AssessmentQuestion
  defaultDisplayOrder?: number
  onSuccess?: () => void
}

export function AssessmentQuestionForm({
  companyId,
  assessmentSectionId,
  question,
  defaultDisplayOrder = 1,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition()

  function submit(formData: FormData) {
    startTransition(async () => {
      const input = {
        assessmentSectionId,
        code: String(formData.get("code") ?? ""),
        question: String(formData.get("question") ?? ""),
        helpText: String(formData.get("helpText") ?? ""),
        questionType: String(formData.get("questionType") ?? "scale") as
          | "scale"
          | "yes_no"
          | "text"
          | "number",
        scaleMin: Number(formData.get("scaleMin") ?? 1),
        scaleMax: Number(formData.get("scaleMax") ?? 5),
        weight: Number(formData.get("weight") ?? 1),
        displayOrder:
          question?.display_order ?? defaultDisplayOrder,
        required: formData.get("required") === "on",
        active: formData.get("active") === "on",
      }

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
    <form action={submit} className="space-y-5">
      <div className="space-y-2">
        <Label>Pergunta</Label>

        <Input
          name="question"
          defaultValue={question?.question}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Texto de ajuda</Label>

        <textarea
          name="helpText"
          defaultValue={question?.help_text ?? ""}
          className="min-h-24 w-full rounded-md border p-3"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tipo</Label>

          <select
            name="questionType"
            defaultValue={
              question?.question_type ?? "scale"
            }
            className="w-full rounded-md border p-2"
          >
            {assessmentQuestionTypeOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Peso</Label>

          <Input
            name="weight"
            type="number"
            step="0.1"
            defaultValue={question?.weight ?? 1}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Escala mínima</Label>

          <Input
            name="scaleMin"
            type="number"
            defaultValue={
              question?.scale_min ?? 1
            }
          />
        </div>

        <div>
          <Label>Escala máxima</Label>

          <Input
            name="scaleMax"
            type="number"
            defaultValue={
              question?.scale_max ?? 5
            }
          />
        </div>
      </div>

      <label className="flex gap-2">
        <input
          type="checkbox"
          name="required"
          defaultChecked={
            question?.required ?? true
          }
        />

        Obrigatória
      </label>

      <label className="flex gap-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={
            question?.active ?? true
          }
        />

        Ativa
      </label>

      <div className="flex justify-end">
        <Button disabled={isPending}>
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
