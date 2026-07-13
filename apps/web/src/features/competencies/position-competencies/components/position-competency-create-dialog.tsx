"use client"

import {
  useMemo,
} from "react"

import {
  CrudCreateDialog,
} from "@/components/shared/crud/crud-create-dialog"

import {
  Button,
} from "@/components/ui/button"

import type {
  Competency,
} from "@/features/competencies"

import {
  PositionCompetencyForm,
} from "./position-competency-form"

type PositionCompetencySummary = {
  competency_id: string
}

type PositionCompetencyCreateDialogProps = {
  companyId: string

  positionId: string

  competencies: Competency[]

  positionCompetencies: PositionCompetencySummary[]
}

export function PositionCompetencyCreateDialog({
  companyId,
  positionId,
  competencies,
  positionCompetencies,
}: PositionCompetencyCreateDialogProps) {
  const availableCompetencies =
    useMemo(() => {
      const linkedCompetencyIds =
        new Set(
          positionCompetencies.map(
            (item) =>
              item.competency_id
          )
        )

      return competencies.filter(
        (competency) =>
          competency.active &&
          !linkedCompetencyIds.has(
            competency.id
          )
      )
    }, [
      competencies,
      positionCompetencies,
    ])

  const hasAvailableCompetencies =
    availableCompetencies.length > 0

  return (
    <CrudCreateDialog
      trigger={
        <Button
          disabled={
            !hasAvailableCompetencies
          }
        >
          Adicionar competência
        </Button>
      }
      title="Adicionar competência esperada"
      description="Defina o nível, o peso e a importância desta competência para o cargo."
    >
      {({ close }) => (
        <PositionCompetencyForm
          companyId={companyId}
          positionId={positionId}
          competencies={
            availableCompetencies
          }
          onSuccess={close}
        />
      )}
    </CrudCreateDialog>
  )
}
