"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

import { archiveAssessmentTemplateAction } from "../../actions/archive-assessment-template-action"

type ArchiveAssessmentTemplateButtonProps = {
  companyId: string
  assessmentTemplateId: string
}

export function ArchiveAssessmentTemplateButton({
  companyId,
  assessmentTemplateId,
}: ArchiveAssessmentTemplateButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveAssessmentTemplateAction(
        companyId,
        assessmentTemplateId
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
      title="Arquivar template de avaliação?"
      description="O template deixará de aparecer nas listagens padrão. As avaliações já vinculadas serão preservadas."
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
