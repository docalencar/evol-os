"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { createTeamAction } from "../actions/create-team-action"
import { updateTeamAction } from "../actions/update-team-action"

type TeamFormProps = {
  companyId: string
  team?: {
    id: string
    name: string
    description: string | null
  }
  onSuccess?: () => void
}

export function TeamForm({
  companyId,
  team,
  onSuccess,
}: TeamFormProps) {
  const [isPending, startTransition] = useTransition()

  const isEditing = Boolean(team)

  function handleSubmit(formData: FormData) {
    const input = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      parentTeamId: null,
      leaderId: null,
    }

    startTransition(async () => {
      const result = team
        ? await updateTeamAction(companyId, team.id, input)
        : await createTeamAction(companyId, input)

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
          placeholder="Ex: Atendimento"
          defaultValue={team?.name ?? ""}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Descrição</Label>

        <Textarea
          id="description"
          name="description"
          placeholder="Descreva a responsabilidade deste time."
          defaultValue={team?.description ?? ""}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando..."
            : isEditing
              ? "Salvar alterações"
              : "Criar time"}
        </Button>
      </div>
    </form>
  )
}
