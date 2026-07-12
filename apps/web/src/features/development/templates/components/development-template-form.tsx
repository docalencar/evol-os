"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createDevelopmentTemplateAction } from "../actions/create-development-template-action"
import { updateDevelopmentTemplateAction } from "../actions/update-development-template-action"
import type { DevelopmentTemplate } from "../types/development-template"

type DevelopmentTemplateFormProps = {
  template?: DevelopmentTemplate
  onSuccess?: () => void
}

export function DevelopmentTemplateForm({
  template,
  onSuccess,
}: DevelopmentTemplateFormProps) {
  const [isPending, startTransition] = useTransition()

  const isEditing = Boolean(template)

  function handleSubmit(formData: FormData) {
    const suggestedDurationDaysValue = String(
      formData.get("suggestedDurationDays") ?? ""
    ).trim()

    const input = {
      name: String(formData.get("name") ?? ""),
      description: String(
        formData.get("description") ?? ""
      ),
      suggestedDurationDays:
        suggestedDurationDaysValue === ""
          ? undefined
          : Number(suggestedDurationDaysValue),
      active: template?.active ?? true,
    }

    startTransition(async () => {
      const result = template
        ? await updateDevelopmentTemplateAction(
            template.id,
            input
          )
        : await createDevelopmentTemplateAction(input)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      onSuccess?.()
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome</Label>

        <Input
          id="name"
          name="name"
          defaultValue={template?.name ?? ""}
          placeholder="Ex.: Liderança para supervisores"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">
          Descrição
        </Label>

        <Input
          id="description"
          name="description"
          defaultValue={template?.description ?? ""}
          placeholder="Descrição do template"
        />
      </div>

      <div>
        <Label htmlFor="suggestedDurationDays">
          Duração sugerida (dias)
        </Label>

        <Input
          id="suggestedDurationDays"
          name="suggestedDurationDays"
          type="number"
          min={1}
          defaultValue={
            template?.suggestedDurationDays ?? ""
          }
          placeholder="Ex.: 30"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Criar template"}
        </Button>
      </div>
    </form>
  )
}