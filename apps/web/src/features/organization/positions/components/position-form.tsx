"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { createPositionAction } from "../actions/create-position-action"
import { updatePositionAction } from "../actions/update-position-action"

type PositionFormProps = {
  companyId: string
  position?: {
    id: string
    name: string
    description: string | null
  }
  onSuccess?: () => void
}

export function PositionForm({
  companyId,
  position,
  onSuccess,
}: PositionFormProps) {
  const [isPending, startTransition] = useTransition()

  const isEditing = Boolean(position)

  function handleSubmit(formData: FormData) {
    const input = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
    }

    startTransition(async () => {
      const result = position
        ? await updatePositionAction(companyId, position.id, input)
        : await createPositionAction(companyId, input)

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
          placeholder="Ex: Analista de RH"
          defaultValue={position?.name ?? ""}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>

        <Textarea
          id="description"
          name="description"
          placeholder="Descreva a responsabilidade deste cargo."
          defaultValue={position?.description ?? ""}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Criar cargo"}
        </Button>
      </div>
    </form>
  )
}
