"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { PositionForm } from "./position-form"

type PositionEditDialogProps = {
  companyId: string
  position: {
    id: string
    name: string
    description: string | null
  }
}

export function PositionEditDialog({
  companyId,
  position,
}: PositionEditDialogProps) {
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
      title="Editar cargo"
      description="Atualize as informações deste cargo."
    >
      <PositionForm
        companyId={companyId}
        position={position}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
