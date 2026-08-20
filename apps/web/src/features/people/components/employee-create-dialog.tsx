"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { SeniorityOptionsByPosition } from "../queries/get-people-seniority-options"
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
  seniorityOptionsByPosition?: SeniorityOptionsByPosition
}

export function EmployeeCreateDialog({
  companyId,
  teams,
  positions,
  managers,
  seniorityOptionsByPosition,
}: EmployeeCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      dismissible={false}
      trigger={
        <Button>
          Novo Colaborador
        </Button>
      }
      title="Novo colaborador"
      description="Cadastre uma pessoa da organização."
      contentClassName="max-w-4xl"
    >
      <EmployeeForm
        companyId={companyId}
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
