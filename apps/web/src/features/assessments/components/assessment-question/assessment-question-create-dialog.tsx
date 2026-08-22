"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { AssessmentQuestionForm } from "./assessment-question-form"
import type { AssessmentCompetencyOption } from "../../types/assessment-question"

type Props = {
  companyId: string
  assessmentSectionId: string
  defaultDisplayOrder?: number
  competencyOptions: AssessmentCompetencyOption[]
}

export function AssessmentQuestionCreateDialog({
  companyId,
  assessmentSectionId,
  defaultDisplayOrder = 1,
  competencyOptions,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button size="sm">Nova pergunta</Button>}
      title="Nova pergunta"
      description="Adicione uma pergunta nesta seção."
      dismissible={false}
    >
      <AssessmentQuestionForm
        companyId={companyId}
        assessmentSectionId={assessmentSectionId}
        defaultDisplayOrder={defaultDisplayOrder}
        competencyOptions={competencyOptions}
        onCancel={() => setOpen(false)}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
