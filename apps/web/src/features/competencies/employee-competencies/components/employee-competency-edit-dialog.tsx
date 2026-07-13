"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { Competency } from "@/features/competencies"

import type { EmployeeCompetencySource } from "../types/employee-competency"

import { EmployeeCompetencyForm } from "./employee-competency-form"

type EmployeeCompetencyEditDialogProps = {
  companyId: string

  employeeId: string

  competencies: Competency[]

  employeeCompetency: {
    id: string
    competencyId: string
    currentLevel: number
    source: EmployeeCompetencySource
    validatedAt: string | null
    notes: string | null
  }
}

export function EmployeeCompetencyEditDialog({
  companyId,
  employeeId,
  competencies,
  employeeCompetency,
}: EmployeeCompetencyEditDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          variant="secondary"
          size="sm"
        >
          Editar
        </Button>
      }
      title="Editar competência"
      description="Atualize o nível atual da competência."
    >
      <EmployeeCompetencyForm
        companyId={companyId}
        employeeId={employeeId}
        competencies={competencies}
        employeeCompetency={
          employeeCompetency
        }
        onSuccess={() =>
          setOpen(false)
        }
      />
    </EntityDialog>
  )
}
