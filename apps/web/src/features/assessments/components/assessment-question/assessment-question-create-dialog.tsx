"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { AssessmentQuestionForm } from "./assessment-question-form"

type Props = {
  companyId: string
  assessmentSectionId: string
  defaultDisplayOrder?: number
}

export function AssessmentQuestionCreateDialog({
  companyId,
  assessmentSectionId,
  defaultDisplayOrder = 1,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button size="sm">Nova pergunta</Button>}
      title="Nova pergunta"
      description="Adicione uma pergunta nesta seção."
    >
      <AssessmentQuestionForm
        companyId={companyId}
        assessmentSectionId={assessmentSectionId}
        defaultDisplayOrder={defaultDisplayOrder}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
