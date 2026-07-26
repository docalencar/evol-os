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

import type {
  DepartmentArchiveChangeSet,
} from "../../change-sets"

import {
  updatePlanningChangeSetAction,
} from "../../actions"


type DepartmentArchiveEditFormProps = {
  changeSet: DepartmentArchiveChangeSet
  scenarioId: string
  onCancel?: () => void
  onSuccess?: () => void
}


export function DepartmentArchiveEditForm({
  changeSet,
  scenarioId,
  onCancel,
  onSuccess,
}: DepartmentArchiveEditFormProps) {
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
          changeType: "department.archive",
          payload: {
            departmentId:
              changeSet.payload.departmentId,
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
          Arquivamento de departamento
        </p>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Esta alteração removerá o departamento da
          estrutura projetada quando o cenário for aplicado.
        </p>

        <div className="mt-4 rounded-lg border bg-background p-3">
          <p className="text-xs text-muted-foreground">
            Identificador do departamento
          </p>

          <p className="mt-1 break-all font-mono text-sm text-foreground">
            {
              changeSet.payload.departmentId
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