"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

import { archiveAssessmentQuestionAction } from "../../actions/archive-assessment-question-action"

type Props = {
  companyId: string
  assessmentQuestionId: string
}

export function ArchiveAssessmentQuestionButton({
  companyId,
  assessmentQuestionId,
}: Props) {
  const [isPending, startTransition] = useTransition()

  function archive() {
    startTransition(async () => {
      const result =
        await archiveAssessmentQuestionAction(
          companyId,
          assessmentQuestionId
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
      title="Arquivar pergunta?"
      description="A pergunta será arquivada."
      confirmLabel="Arquivar"
      loading={isPending}
      onConfirm={archive}
    >
      <Button
        variant="secondary"
        size="sm"
      >
        Arquivar
      </Button>
    </ConfirmDialog>
  )
}
