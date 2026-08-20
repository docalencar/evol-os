"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

import { addPositionSeniorityAction } from "../actions/add-position-seniority-action"
import type { AvailableSeniority } from "../presenters/present-position-seniorities"

type AddPositionSeniorityDialogProps = {
  positionId: string
  available: AvailableSeniority[]
}

export function AddPositionSeniorityDialog({
  positionId,
  available,
}: AddPositionSeniorityDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    const seniorityLevelId = String(formData.get("seniorityLevelId") ?? "")

    startTransition(async () => {
      const result = await addPositionSeniorityAction({
        positionId,
        seniorityLevelId,
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      setOpen(false)
    })
  }

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Adicionar senioridade</Button>}
      title="Adicionar senioridade ao cargo"
      description="Escolha uma senioridade do catálogo da empresa para aplicar a este cargo."
    >
      <form action={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="seniorityLevelId">Senioridade</Label>

          <select
            id="seniorityLevelId"
            name="seniorityLevelId"
            required
            className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {available.map((seniority) => (
              <option key={seniority.id} value={seniority.id}>
                {seniority.label}
              </option>
            ))}
          </select>

          <p className="mt-1 text-xs text-slate-500">
            Apenas senioridades do catálogo que ainda não foram aplicadas a este
            cargo aparecem aqui.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Aplicando..." : "Aplicar"}
          </Button>
        </div>
      </form>
    </EntityDialog>
  )
}
