"use client"

import { useMemo, useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import type { Competency } from "@/features/competencies"

import { EmployeeCompetencyForm } from "./employee-competency-form"

type EmployeeCompetencySummary = {
  competency_id: string
}

type EmployeeCompetencyCreateDialogProps = {
  companyId: string

  employeeId: string

  competencies: Competency[]

  employeeCompetencies: EmployeeCompetencySummary[]
}

export function EmployeeCompetencyCreateDialog({
  companyId,
  employeeId,
  competencies,
  employeeCompetencies,
}: EmployeeCompetencyCreateDialogProps) {
  const [open, setOpen] = useState(false)

  const availableCompetencies =
    useMemo(() => {
      const usedCompetencies =
        new Set(
          employeeCompetencies.map(
            (item) => item.competency_id
          )
        )

      return competencies.filter(
        (competency) =>
          !usedCompetencies.has(
            competency.id
          )
      )
    }, [
      competencies,
      employeeCompetencies,
    ])

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          disabled={
            availableCompetencies.length ===
            0
          }
        >
          Adicionar competência
        </Button>
      }
      title="Adicionar competência"
      description="Associe uma competência ao colaborador."
    >
      <EmployeeCompetencyForm
        companyId={companyId}
        employeeId={employeeId}
        competencies={
          availableCompetencies
        }
        onSuccess={() =>
          setOpen(false)
        }
      />
    </EntityDialog>
  )
}
