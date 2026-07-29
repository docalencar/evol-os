"use client"

import { CrudCreateDialog } from "@/components/shared/crud/crud-create-dialog"
import { Button } from "@/components/ui/button"

import { CreateScenarioForm } from "./create-scenario-form"

type CreateScenarioDialogProps = {
  workspaceId: string
  baseSnapshotId: string
}

export function CreateScenarioDialog({
  workspaceId,
  baseSnapshotId,
}: CreateScenarioDialogProps) {
  return (
    <CrudCreateDialog
      trigger={<Button>Novo Cenário</Button>}
      title="Novo cenário"
      description="Crie uma alternativa a partir do snapshot-base selecionado."
    >
      {({ close }) => (
        <CreateScenarioForm
          workspaceId={workspaceId}
          baseSnapshotId={baseSnapshotId}
          onSuccess={close}
          onCancel={close}
        />
      )}
    </CrudCreateDialog>
  )
}
