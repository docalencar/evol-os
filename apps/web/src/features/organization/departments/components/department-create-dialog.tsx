"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { DepartmentForm } from "./department-form"

type DepartmentCreateDialogProps = {
  companyId: string
}

export function DepartmentCreateDialog({
  companyId,
}: DepartmentCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Novo Departamento</Button>}
      title="Novo departamento"
      description="Cadastre uma área da organização."
    >
      <DepartmentForm
        companyId={companyId}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
