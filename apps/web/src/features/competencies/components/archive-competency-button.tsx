"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

import { archiveCompetencyAction } from "../actions/archive-competency-action"

type ArchiveCompetencyButtonProps = {
  companyId: string
  competencyId: string
}

export function ArchiveCompetencyButton({
  companyId,
  competencyId,
}: ArchiveCompetencyButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveCompetencyAction(
        companyId,
        competencyId
      )

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
    })
  }

  return (
    <ConfirmDialog
      title="Arquivar competência?"
      description="A competência será arquivada e deixará de aparecer nas listagens padrão. Esta ação poderá ser revertida futuramente."
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
