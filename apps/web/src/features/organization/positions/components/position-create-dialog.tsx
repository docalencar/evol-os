"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { PositionForm } from "./position-form"

type PositionCreateDialogProps = {
  companyId: string
}

export function PositionCreateDialog({ companyId }: PositionCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Novo cargo</Button>}
      title="Novo cargo"
      description="Cadastre um cargo da organização."
    >
      <PositionForm companyId={companyId} onSuccess={() => setOpen(false)} />
    </EntityDialog>
  )
}

