"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { SeniorityLevelForm } from "./seniority-level-form"
import type { SeniorityLevel } from "../types/seniority-level"

type SeniorityLevelEditDialogProps = {
  companyId: string
  seniorityLevel: SeniorityLevel
}

export function SeniorityLevelEditDialog({
  companyId,
  seniorityLevel,
}: SeniorityLevelEditDialogProps) {
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
      title="Editar senioridade"
      description="Atualize o código, o nome ou a ordem."
    >
      <SeniorityLevelForm
        companyId={companyId}
        seniorityLevel={seniorityLevel}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
