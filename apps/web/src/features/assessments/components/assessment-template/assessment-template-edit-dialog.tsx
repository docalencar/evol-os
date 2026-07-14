"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { AssessmentTemplate } from "../../types/assessment-template"
import { AssessmentTemplateForm } from "./assessment-template-form"

type AssessmentTemplateEditDialogProps = {
  companyId: string
  template: AssessmentTemplate
}

export function AssessmentTemplateEditDialog({
  companyId,
  template,
}: AssessmentTemplateEditDialogProps) {
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
      title="Editar template de avaliação"
      description="Atualize a estrutura e as instruções deste template."
    >
      <AssessmentTemplateForm
        companyId={companyId}
        template={template}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
