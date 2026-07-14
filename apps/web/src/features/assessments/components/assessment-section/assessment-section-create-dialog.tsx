"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { AssessmentSectionForm } from "./assessment-section-form"

type AssessmentSectionCreateDialogProps = {
  companyId: string
  assessmentTemplateId: string
  defaultDisplayOrder?: number
}

export function AssessmentSectionCreateDialog({
  companyId,
  assessmentTemplateId,
  defaultDisplayOrder = 0,
}: AssessmentSectionCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Nova seção</Button>}
      title="Nova seção"
      description="Organize as perguntas do template em grupos."
    >
      <AssessmentSectionForm
        companyId={companyId}
        assessmentTemplateId={assessmentTemplateId}
        defaultDisplayOrder={defaultDisplayOrder}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
