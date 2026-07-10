"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { Competency } from "../types/competency"
import { CompetencyForm } from "./competency-form"

type CompetencyEditDialogProps = {
  companyId: string
  competency: Competency
}

export function CompetencyEditDialog({
  companyId,
  competency,
}: CompetencyEditDialogProps) {
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
      title="Editar competência"
      description="Atualize os dados da competência."
    >
      <CompetencyForm
        companyId={companyId}
        competency={competency}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
