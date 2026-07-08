"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { Employee } from "../types/employee"
import { EmployeeForm } from "./employee-form"

type EmployeeSelectOption = {
  id: string
  name: string
}

type EmployeeEditDialogProps = {
  companyId: string
  employee: Employee
  teams: EmployeeSelectOption[]
  positions: EmployeeSelectOption[]
}

export function EmployeeEditDialog({
  companyId,
  employee,
  teams,
  positions,
}: EmployeeEditDialogProps) {
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
      title="Editar colaborador"
      description="Atualize as informações desta pessoa."
    >
      <EmployeeForm
        companyId={companyId}
        employee={employee}
        teams={teams}
        positions={positions}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
