"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

import { archivePositionAction } from "../actions/archive-position-action"

type Props = {
  companyId: string
  positionId: string
}

export function ArchivePositionButton({ companyId, positionId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    startTransition(async () => {
      const result = await archivePositionAction(companyId, positionId)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
    })
  }

  return (
    <ConfirmDialog
      title="Arquivar cargo?"
      description="O cargo será arquivado e deixará de aparecer nas listagens padrão. Esta ação pode ser revertida futuramente."
      confirmLabel="Arquivar"
      loading={isPending}
      onConfirm={handleArchive}
    >
      <Button variant="secondary" size="sm" disabled={isPending}>
        {isPending ? "Arquivando..." : "Arquivar"}
      </Button>
    </ConfirmDialog>
  )
}
