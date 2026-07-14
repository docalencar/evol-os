"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { AssessmentQuestion } from "../../types/assessment-question"
import { AssessmentQuestionForm } from "./assessment-question-form"

type Props = {
  companyId: string
  question: AssessmentQuestion
}

export function AssessmentQuestionEditDialog({
  companyId,
  question,
}: Props) {
  const [open, setOpen] = useState(false)

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
    >
      <AssessmentQuestionForm
        companyId={companyId}
        assessmentSectionId={question.assessment_section_id}
        question={question}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
