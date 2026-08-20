"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import {
  PositionForm,
  type DepartmentOption,
  type PositionFormPosition,
  type SeniorityLevelOption,
} from "./position-form"

type PositionEditDialogProps = {
  companyId: string
  departments: DepartmentOption[]
  position: PositionFormPosition
  seniorityLevels?: SeniorityLevelOption[]
  initialSeniorityLevelIds?: string[]
}

export function PositionEditDialog({
  companyId,
  departments,
  position,
  seniorityLevels,
  initialSeniorityLevelIds,
}: PositionEditDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      dismissible={false}
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
        seniorityLevels={seniorityLevels}
        initialSeniorityLevelIds={initialSeniorityLevelIds}
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
