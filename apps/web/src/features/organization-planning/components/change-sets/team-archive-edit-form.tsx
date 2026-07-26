"use client"

import {
  useTransition,
} from "react"

import {
  useRouter,
} from "next/navigation"

import {
  toast,
} from "sonner"

import {
  Button,
} from "@/components/ui/button"

import {
  updatePlanningChangeSetAction,
} from "../../actions"

import type {
  TeamArchiveChangeSet,
} from "../../change-sets"


type TeamArchiveEditFormProps = {
  changeSet: TeamArchiveChangeSet
  scenarioId: string
  onCancel?: () => void
  onSuccess?: () => void
}


export function TeamArchiveEditForm({
  changeSet,
  scenarioId,
  onCancel,
  onSuccess,
}: TeamArchiveEditFormProps) {
  const router = useRouter()

  const [
    isPending,
    startTransition,
  ] = useTransition()


  function handleSubmit() {
    startTransition(async () => {
      const result =
        await updatePlanningChangeSetAction({
          scenarioId,
          changeSetId: changeSet.id,
          expectedVersion: changeSet.version,
          changeType: "team.archive",
          payload: {
            teamId:
              changeSet.payload.teamId,
          },
        })


      if (!result.success) {
        toast.error(result.message)
        return
      }


      toast.success(result.message)

      router.refresh()

      onSuccess?.()
    })
  }


  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-sm font-medium text-foreground">
          Arquivamento de time
        </p>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Esta alteração removerá o time da estrutura
          projetada quando o cenário for aplicado.
        </p>

        <div className="mt-4 rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">
            Identificador do time
          </p>

          <p className="mt-1 break-all font-mono text-sm text-foreground">
            {
              changeSet.payload.teamId
            }
          </p>
        </div>
      </div>


      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={onCancel}
        >
          Voltar
        </Button>


        <Button
          type="button"
          variant="destructive"
          disabled={isPending}
          onClick={handleSubmit}
        >
          {isPending
            ? "Salvando alteração..."
            : "Confirmar arquivamento"}
        </Button>
      </div>
    </div>
  )
}