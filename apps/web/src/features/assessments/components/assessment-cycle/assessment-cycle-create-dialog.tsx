"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { AssessmentTemplate } from "../../types/assessment-template"
import { AssessmentCycleForm } from "./assessment-cycle-form"

type AssessmentCycleCreateDialogProps = {
  companyId: string
  templates: AssessmentTemplate[]
}

export function AssessmentCycleCreateDialog({
  companyId,
  templates,
}: AssessmentCycleCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Novo ciclo</Button>}
      title="Novo ciclo de avaliação"
      description="Configure o período e as origens da avaliação."
    >
      <AssessmentCycleForm
        companyId={companyId}
        templates={templates}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
