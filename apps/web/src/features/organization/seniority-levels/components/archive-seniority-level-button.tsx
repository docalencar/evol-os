"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

import { archiveSeniorityLevelAction } from "../actions/archive-seniority-level-action"

type ArchiveSeniorityLevelButtonProps = {
  companyId: string
  seniorityLevelId: string
}

export function ArchiveSeniorityLevelButton({
  companyId,
  seniorityLevelId,
}: ArchiveSeniorityLevelButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveSeniorityLevelAction(
        companyId,
        seniorityLevelId
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
      title="Arquivar senioridade?"
      description="A senioridade será arquivada e deixará de aparecer para novos usos. O histórico é preservado."
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
