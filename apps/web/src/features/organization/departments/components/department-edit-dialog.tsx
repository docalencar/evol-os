"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { DepartmentForm } from "./department-form"

type DepartmentEditDialogProps = {
  companyId: string
  department: {
    id: string
    name: string
    description: string | null
  }
}

export function DepartmentEditDialog({
  companyId,
  department,
}: DepartmentEditDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      dismissible={false}
      trigger={
        <Button variant="secondary" size="sm">
          Editar
        </Button>
      }
      title="Editar departamento"
      description="Atualize as informações desta área da organização."
    >
      <DepartmentForm
        companyId={companyId}
        department={department}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}