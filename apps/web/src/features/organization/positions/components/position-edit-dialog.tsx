"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import {
  PositionForm,
  type DepartmentOption,
  type PositionFormPosition,
} from "./position-form"

type PositionEditDialogProps = {
  companyId: string
  departments: DepartmentOption[]
  position: PositionFormPosition
}

export function PositionEditDialog({
  companyId,
  departments,
  position,
}: PositionEditDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          variant="secondary"
          size="sm"
        >
          Editar
        </Button>
      }
      title="Editar cargo"
      description="Atualize as informações deste cargo."
      contentClassName="max-w-4xl"
    >
      <PositionForm
        companyId={companyId}
        departments={departments}
        position={position}
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
