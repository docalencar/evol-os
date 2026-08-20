"use client"

import { toast } from "sonner"

import { CrudArchiveButton } from "@/components/shared/crud/crud-archive-button"

import { archivePositionSeniorityAction } from "../actions/archive-position-seniority-action"

type RemovePositionSeniorityButtonProps = {
  positionId: string
  profileId: string
}

export function RemovePositionSeniorityButton({
  positionId,
  profileId,
}: RemovePositionSeniorityButtonProps) {
  return (
    <CrudArchiveButton
      title="Remover senioridade do cargo?"
      description="A senioridade deixará de ser aplicável a este cargo. Ela continuará disponível no catálogo da empresa."
      confirmLabel="Remover"
      pendingLabel="Removendo..."
      idleLabel="Remover"
      onArchive={async () => {
        const result = await archivePositionSeniorityAction({
          positionId,
          profileId,
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
