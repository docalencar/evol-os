"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { AssessmentTemplate } from "../../types/assessment-template"
import { AssessmentCycleForm } from "./assessment-cycle-form"

type AssessmentCycleCreateDialogProps = {
  companyId: string
  templates: AssessmentTemplate[]
  triggerLabel?: string
  triggerClassName?: string
}

export function AssessmentCycleCreateDialog({
  companyId,
  templates,
  triggerLabel = "Novo ciclo",
  triggerClassName,
}: AssessmentCycleCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button className={triggerClassName}>
          {triggerLabel}
        </Button>
      }
      title="Nova avaliação"
      description="Escolha o modelo, o período e quem participará da avaliação."
    >
      <AssessmentCycleForm
        companyId={companyId}
        templates={templates}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
