"use client"

import {
  CrudCreateDialog,
} from "@/components/shared/crud/crud-create-dialog"

import {
  Button,
} from "@/components/ui/button"

import {
  PositionRequirementForm,
} from "./position-requirement-form"

type PositionRequirementCreateDialogProps = {
  positionId: string
}

export function PositionRequirementCreateDialog({
  positionId,
}: PositionRequirementCreateDialogProps) {
  return (
    <CrudCreateDialog
      trigger={
        <Button>
          Novo requisito
        </Button>
      }
      title="Novo requisito técnico"
      description="Cadastre um requisito técnico esperado para este cargo."
    >
      {({ close }) => (
        <PositionRequirementForm
          positionId={positionId}
          onSuccess={close}
        />
      )}
    </CrudCreateDialog>
  )
}