"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { EmployeeForm } from "./employee-form"

type EmployeeCreateDialogProps = {
  companyId: string
}

export function EmployeeCreateDialog({ companyId }: EmployeeCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Novo Colaborador</Button>}
      title="Novo colaborador"
      description="Cadastre uma pessoa da organização."
    >
      <EmployeeForm companyId={companyId} onSuccess={() => setOpen(false)} />
    </EntityDialog>
  )
}
