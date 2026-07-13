"use client"

import { Button } from "@/components/ui/button"

import { CrudCreateDialog } from "@/components/shared/crud/crud-create-dialog"

import {
  PositionRequirementForm,
} from "./position-requirement-form"

import type {
  PositionRequirement,
} from "../types/position-requirement"

type PositionRequirementEditDialogProps = {
  positionRequirement: PositionRequirement
}

export function PositionRequirementEditDialog({
  positionRequirement,
}: PositionRequirementEditDialogProps) {
  return (
    <CrudCreateDialog
      trigger={
        <Button
          variant="secondary"
          size="sm"
        >
          Editar
        </Button>
      }
      title="Editar requisito técnico"
      description="Atualize as informações deste requisito."
    >
      {({ close }) => (
        <PositionRequirementForm
          positionId={
            positionRequirement.position_id
          }
          positionRequirement={{
            id: positionRequirement.id,
            category:
              positionRequirement.category,
            value:
              positionRequirement.value,
            required:
              positionRequirement.required,
            notes:
              positionRequirement.notes,
          }}
          onSuccess={close}
        />
      )}
    </CrudCreateDialog>
  )
}
