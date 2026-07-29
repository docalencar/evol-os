"use client"

import { CrudCreateDialog } from "@/components/shared/crud/crud-create-dialog"
import { Button } from "@/components/ui/button"

import { CreateWorkspaceForm } from "./create-workspace-form"

export function CreateWorkspaceDialog() {
  return (
    <CrudCreateDialog
      trigger={<Button>Novo Workspace</Button>}
      title="Novo workspace"
      description="Crie um ambiente de planejamento para novos cenários organizacionais."
    >
      {({ close }) => (
        <CreateWorkspaceForm
          onSuccess={close}
          onCancel={close}
        />
      )}
    </CrudCreateDialog>
  )
}
