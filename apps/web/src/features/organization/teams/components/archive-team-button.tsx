"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

import { archiveTeamAction } from "../actions/archive-team-action"

type Props = {
  companyId: string
  teamId: string
}

export function ArchiveTeamButton({ companyId, teamId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveTeamAction(companyId, teamId)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
    })
  }

  return (
    <ConfirmDialog
      title="Arquivar time?"
      description="O time será arquivado e deixará de aparecer nas listagens padrão. Esta ação pode ser revertida futuramente."
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
