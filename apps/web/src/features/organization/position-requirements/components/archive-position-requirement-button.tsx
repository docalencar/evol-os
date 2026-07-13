"use client"

import { toast } from "sonner"

import { CrudArchiveButton } from "@/components/shared/crud/crud-archive-button"

import {
  archivePositionRequirementAction,
} from "../actions/archive-position-requirement-action"

type ArchivePositionRequirementButtonProps = {
  positionRequirementId: string
  positionId: string
}

export function ArchivePositionRequirementButton({
  positionRequirementId,
  positionId,
}: ArchivePositionRequirementButtonProps) {
  return (
    <CrudArchiveButton
      title="Arquivar requisito técnico?"
      description="Este requisito deixará de aparecer para este cargo, mas poderá ser recuperado futuramente."
      onArchive={async () => {
        const result =
          await archivePositionRequirementAction({
            positionRequirementId,
            positionId,
          })

        if (!result.success) {
          toast.error(result.message)
          return
        }

        toast.success(result.message)
      }}
    />
  )
}
