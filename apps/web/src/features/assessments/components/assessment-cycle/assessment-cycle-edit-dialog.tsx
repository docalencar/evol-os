"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { AssessmentCycle } from "../../types/assessment-cycle"
import { AssessmentCycleForm } from "./assessment-cycle-form"

type AssessmentCycleEditDialogProps = {
  companyId: string
  cycle: AssessmentCycle
}

export function AssessmentCycleEditDialog({
  companyId,
  cycle,
}: AssessmentCycleEditDialogProps) {
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
      title="Editar ciclo de avaliação"
      description="Atualize as configurações deste ciclo."
    >
      <AssessmentCycleForm
        companyId={companyId}
        cycle={cycle}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
