"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { CompetencyForm } from "./competency-form"

type CompetencyCreateDialogProps = {
  companyId: string
}

export function CompetencyCreateDialog({
  companyId,
}: CompetencyCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Nova Competência</Button>}
      title="Nova competência"
      description="Cadastre uma competência da organização."
    >
      <CompetencyForm
        companyId={companyId}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}

