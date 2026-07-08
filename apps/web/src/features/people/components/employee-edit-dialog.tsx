"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { Employee } from "../types/employee"
import { EmployeeForm } from "./employee-form"

type EmployeeEditDialogProps = {
  companyId: string
  employee: Employee
}

export function EmployeeEditDialog({
  companyId,
  employee,
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
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
