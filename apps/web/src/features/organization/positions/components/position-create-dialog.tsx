"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import {
  PositionForm,
  type DepartmentOption,
  type SeniorityLevelOption,
} from "./position-form"

type PositionCreateDialogProps = {
  companyId: string
  departments: DepartmentOption[]
  seniorityLevels?: SeniorityLevelOption[]
}

export function PositionCreateDialog({
  companyId,
  departments,
  seniorityLevels,
}: PositionCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      dismissible={false}
      trigger={
        <Button>
          Novo cargo
        </Button>
      }
      title="Novo cargo"
      description="Cadastre um cargo da organização."
      contentClassName="max-w-4xl"
    >
      <PositionForm
        companyId={companyId}
        departments={departments}
        seniorityLevels={seniorityLevels}
        onSuccess={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
