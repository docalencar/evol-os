"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createAssessmentTemplateAction } from "../../actions/create-assessment-template-action"
import { updateAssessmentTemplateAction } from "../../actions/update-assessment-template-action"
import {
  assessmentTemplateStatusOptions,
  assessmentTemplateTypeOptions,
} from "../../constants/assessment-template-options"
import type { AssessmentTemplate } from "../../types/assessment-template"

type AssessmentTemplateFormProps = {
  companyId: string
  template?: AssessmentTemplate
  onSuccess?: () => void
}

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

const textareaClassName =
  "flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export function AssessmentTemplateForm({
  companyId,
  template,
  onSuccess,
}: AssessmentTemplateFormProps) {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = template
        ? await updateAssessmentTemplateAction(
            companyId,
            template.id,
            formData
          )
        : await createAssessmentTemplateAction(companyId, formData)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do template</Label>

        <Input
          id="name"
          name="name"
          defaultValue={template?.name ?? ""}
          placeholder="Ex.: Avaliação Anual de Desempenho"
          minLength={2}
          maxLength={120}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>

        <textarea
          id="description"
          name="description"
          className={textareaClassName}
          defaultValue={template?.description ?? ""}
          placeholder="Explique o objetivo deste template."
          maxLength={500}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructions">Instruções para avaliação</Label>

        <textarea
          id="instructions"
          name="instructions"
          className={textareaClassName}
          defaultValue={template?.instructions ?? ""}
          placeholder="Oriente os avaliadores sobre como responder."
          maxLength={2000}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo</Label>

          <select
            id="type"
            name="type"
            className={selectClassName}
            defaultValue={template?.type ?? "annual"}
            required
          >
            {assessmentTemplateTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>

          <select
            id="status"
            name="status"
            className={selectClassName}
            defaultValue={template?.status ?? "draft"}
            required
          >
            {assessmentTemplateStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : template
              ? "Salvar alterações"
              : "Criar template"}
        </Button>
      </div>
    </form>
  )
}
