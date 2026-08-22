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
      trigger={<Button variant="secondary">Novo modelo</Button>}
      title="Novo modelo de avaliação"
      description="Crie uma estrutura reutilizável para avaliações."
      dismissible={false}
    >
      <AssessmentTemplateForm
        companyId={companyId}
        onCancel={() => setOpen(false)}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
