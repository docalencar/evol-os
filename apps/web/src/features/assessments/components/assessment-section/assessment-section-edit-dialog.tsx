"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { AssessmentSection } from "../../types/assessment-section"
import { AssessmentSectionForm } from "./assessment-section-form"

type AssessmentSectionEditDialogProps = {
  companyId: string
  section: AssessmentSection
}

export function AssessmentSectionEditDialog({
  companyId,
  section,
}: AssessmentSectionEditDialogProps) {
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
      title="Editar seção"
      description="Atualize a organização desta seção."
    >
      <AssessmentSectionForm
        companyId={companyId}
        assessmentTemplateId={section.assessment_template_id}
        section={section}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
