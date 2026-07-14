"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

import { archiveAssessmentSectionAction } from "../../actions/archive-assessment-section-action"

type ArchiveAssessmentSectionButtonProps = {
  companyId: string
  assessmentSectionId: string
}

export function ArchiveAssessmentSectionButton({
  companyId,
  assessmentSectionId,
}: ArchiveAssessmentSectionButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveAssessmentSectionAction(
        companyId,
        assessmentSectionId
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
      title="Arquivar seção?"
      description="A seção deixará de aparecer no template. Os dados relacionados serão preservados."
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
