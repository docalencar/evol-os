"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { createDevelopmentTemplateAction } from "../actions/create-development-template-action"

type DevelopmentTemplateFormProps = {
  onSuccess?: () => void
}

/**
 * Creates a template DRAFT. There is no edit branch: D-P0 scopes editing to a
 * draft's additive construction and makes a published version immutable, so
 * updating a template's metadata after the fact has no trusted operation behind
 * it. The branch that used to be here called a server action that no longer
 * exists — leaving it would have meant a button that fails only at runtime.
 */
export function DevelopmentTemplateForm({
  onSuccess,
}: DevelopmentTemplateFormProps) {
  const [isPending, startTransition] = useTransition()

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
    }

    startTransition(async () => {
      const result = await createDevelopmentTemplateAction(input)

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
          defaultValue=""
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
          defaultValue=""
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
          defaultValue=""
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
            : "Criar template"}
        </Button>
      </div>
    </form>
  )
}