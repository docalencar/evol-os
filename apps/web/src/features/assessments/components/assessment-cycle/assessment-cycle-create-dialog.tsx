"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { AssessmentCycleForm } from "./assessment-cycle-form"

type AssessmentCycleCreateDialogProps = {
  companyId: string
}

export function AssessmentCycleCreateDialog({
  companyId,
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
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
