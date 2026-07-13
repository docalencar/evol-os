"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type {
  PositionHierarchicalLevel,
  PositionStatus,
} from "../types/position"
import { PositionForm } from "./position-form"

type DepartmentOption = {
  id: string
  name: string
}

type PositionEditDialogProps = {
  companyId: string
  departments: DepartmentOption[]
  position: {
    id: string
    name: string
    description: string | null
    department_id: string | null
    hierarchical_level: PositionHierarchicalLevel
    status: PositionStatus
  }
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
        <Button variant="secondary" size="sm">
          Editar
        </Button>
      }
      title="Editar cargo"
      description="Atualize as informações deste cargo."
    >
      <PositionForm
        companyId={companyId}
        departments={departments}
        position={position}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}