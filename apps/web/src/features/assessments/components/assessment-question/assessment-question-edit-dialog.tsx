"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { AssessmentQuestion } from "../../types/assessment-question"
import type { AssessmentCompetencyOption } from "../../types/assessment-question"
import { AssessmentQuestionForm } from "./assessment-question-form"

type Props = {
  companyId: string
  question: AssessmentQuestion
  competencyOptions: AssessmentCompetencyOption[]
}

export function AssessmentQuestionEditDialog({
  companyId,
  question,
  competencyOptions,
}: Props) {
  const [open, setOpen] = useState(false)
  const selectableCompetencies =
    question.competency_id &&
    question.competency_name &&
    !competencyOptions.some((option) => option.id === question.competency_id)
      ? [
          ...competencyOptions,
          {
            id: question.competency_id,
            name: `${question.competency_name} (arquivada)`,
          },
        ]
      : competencyOptions

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="secondary" size="sm">
          Editar
        </Button>
      }
      title="Editar pergunta"
      description="Atualize esta pergunta."
      dismissible={false}
    >
      <AssessmentQuestionForm
        companyId={companyId}
        assessmentSectionId={question.assessment_section_id}
        question={question}
        competencyOptions={selectableCompetencies}
        onCancel={() => setOpen(false)}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
