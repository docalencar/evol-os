"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { EmployeeForm } from "./employee-form"

type EmployeeSelectOption = {
  id: string
  name: string
}

type EmployeeCreateDialogProps = {
  companyId: string
  teams: EmployeeSelectOption[]
  positions: EmployeeSelectOption[]
  managers: EmployeeSelectOption[]
}

export function EmployeeCreateDialog({
  companyId,
  teams,
  positions,
  managers,
}: EmployeeCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Novo Colaborador</Button>}
      title="Novo colaborador"
      description="Cadastre uma pessoa da organização."
    >
      <EmployeeForm
        companyId={companyId}
        teams={teams}
        positions={positions}
        managers={managers}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
