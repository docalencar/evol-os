"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { createScenarioAction } from "../actions"

type CreateScenarioFormProps = {
  workspaceId: string
  baseSnapshotId: string
  onSuccess: () => void
  onCancel: () => void
}

export function CreateScenarioForm({
  workspaceId,
  baseSnapshotId,
  onSuccess,
  onCancel,
}: CreateScenarioFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createScenarioAction({
        scenarioId: crypto.randomUUID(),
        workspaceId,
        baseSnapshotId,
        name: String(formData.get("name") ?? ""),
        description:
          String(formData.get("description") ?? "") || null,
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      onSuccess()
      router.refresh()
    })
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="planning-scenario-name">
          Nome
        </Label>

        <Input
          id="planning-scenario-name"
          name="name"
          placeholder="Ex.: Estrutura do próximo trimestre"
          required
          disabled={isPending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="planning-scenario-description">
          Descrição
        </Label>

        <Textarea
          id="planning-scenario-description"
          name="description"
          placeholder="Contextualize o objetivo deste cenário."
          disabled={isPending}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancelar
        </Button>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando..." : "Criar cenário"}
        </Button>
      </div>
    </form>
  )
}
