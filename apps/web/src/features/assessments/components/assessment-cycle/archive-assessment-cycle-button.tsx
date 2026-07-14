"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

import { archiveAssessmentCycleAction } from "../../actions/archive-assessment-cycle-action"

type ArchiveAssessmentCycleButtonProps = {
  companyId: string
  assessmentCycleId: string
}

export function ArchiveAssessmentCycleButton({
  companyId,
  assessmentCycleId,
}: ArchiveAssessmentCycleButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveAssessmentCycleAction(
        companyId,
        assessmentCycleId
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
      title="Arquivar ciclo de avaliação?"
      description="O ciclo deixará de aparecer nas listagens padrão. Os dados relacionados serão preservados."
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
