"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { AssessmentTemplateForm } from "./assessment-template-form"

type AssessmentTemplateCreateDialogProps = {
  companyId: string
}

export function AssessmentTemplateCreateDialog({
  companyId,
}: AssessmentTemplateCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="secondary">Novo template</Button>}
      title="Novo template de avaliação"
      description="Crie uma estrutura reutilizável para avaliações."
    >
      <AssessmentTemplateForm
        companyId={companyId}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
