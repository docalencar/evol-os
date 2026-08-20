"use client"

import type { ReactElement } from "react"
import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { SeniorityOptionsByPosition } from "../queries/get-people-seniority-options"
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
  managers: EmployeeSelectOption[]
  seniorityOptionsByPosition?: SeniorityOptionsByPosition
  trigger?: ReactElement
}

export function EmployeeEditDialog({
  companyId,
  employee,
  teams,
  positions,
  managers,
  seniorityOptionsByPosition,
  trigger,
}: EmployeeEditDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        trigger ?? (
          <Button
            variant="secondary"
            size="sm"
          >
            Editar
          </Button>
        )
      }
      title="Editar colaborador"
      description="Atualize as informações desta pessoa."
      contentClassName="max-w-4xl"
      dismissible={false}
    >
      <EmployeeForm
        companyId={companyId}
        employee={employee}
        teams={teams}
        positions={positions}
        managers={managers}
        seniorityOptionsByPosition={seniorityOptionsByPosition}
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
