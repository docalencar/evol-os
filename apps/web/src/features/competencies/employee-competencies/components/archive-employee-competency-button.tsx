"use client"

import {
  toast,
} from "sonner"

import {
  CrudArchiveButton,
} from "@/components/shared/crud/crud-archive-button"

import {
  archiveEmployeeCompetencyAction,
} from "../actions/archive-employee-competency-action"

type ArchiveEmployeeCompetencyButtonProps = {
  companyId: string

  employeeId: string

  employeeCompetencyId: string

  competencyName: string
}

export function ArchiveEmployeeCompetencyButton({
  companyId,
  employeeId,
  employeeCompetencyId,
  competencyName,
}: ArchiveEmployeeCompetencyButtonProps) {
  async function handleArchive() {
    const result =
      await archiveEmployeeCompetencyAction(
        companyId,
        employeeId,
        employeeCompetencyId
      )

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(result.message)
  }

  return (
    <CrudArchiveButton
      title="Arquivar competência"
      description={`Tem certeza que deseja arquivar a competência "${competencyName}" deste colaborador?`}
      confirmLabel="Arquivar"
      pendingLabel="Arquivando..."
      idleLabel="Arquivar"
      onArchive={handleArchive}
    />
  )
}
