"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { PlanningScenarioForm } from "./planning-scenario-form"

type PlanningScenarioCreateDialogProps = {
  workspaceId: string
  baseSnapshotId: string
  triggerLabel?: string
  triggerClassName?: string
}

export function PlanningScenarioCreateDialog({
  workspaceId,
  baseSnapshotId,
  triggerLabel = "Novo cenário",
  triggerClassName,
}: PlanningScenarioCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button className={triggerClassName}>
          {triggerLabel}
        </Button>
      }
      title="Novo cenário"
      description="Crie um cenário para simular alterações na estrutura organizacional."
    >
      <PlanningScenarioForm
        workspaceId={workspaceId}
        baseSnapshotId={baseSnapshotId}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
