"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { createWorkspaceAction } from "../actions"

type CreateWorkspaceFormProps = {
  onSuccess: () => void
  onCancel: () => void
}

export function CreateWorkspaceForm({
  onSuccess,
  onCancel,
}: CreateWorkspaceFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    startTransition(async () => {
      const result = await createWorkspaceAction({
        workspaceId: crypto.randomUUID(),
        initialSnapshotId: crypto.randomUUID(),
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
      <p className="text-sm text-slate-600">
        Um workspace cria o ambiente inicial para organizar
        cenários e versões da estrutura organizacional.
      </p>

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
          {isPending ? "Criando..." : "Criar workspace"}
        </Button>
      </div>
    </form>
  )
}
