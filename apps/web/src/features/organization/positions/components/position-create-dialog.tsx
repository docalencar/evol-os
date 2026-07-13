"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { PositionForm } from "./position-form"

type DepartmentOption = {
  id: string
  name: string
}

type PositionCreateDialogProps = {
  companyId: string
  departments: DepartmentOption[]
}

export function PositionCreateDialog({
  companyId,
  departments,
}: PositionCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Novo cargo</Button>}
      title="Novo cargo"
      description="Cadastre um cargo da organização."
    >
      <PositionForm
        companyId={companyId}
        departments={departments}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
