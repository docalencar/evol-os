"use client"

import React from "react"

import {
  DashboardCard,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"

import type {
  CompetencyMatrixCellViewModel,
  PositionSeniorityCompetencyMatrixViewModel,
} from "../presenters/present-position-seniority-competency-matrix"
import { AddPositionSeniorityCompetencyDialog } from "./add-position-seniority-competency-dialog"
import { PositionSeniorityCompetencyEditorDialog } from "./position-seniority-competency-editor-dialog"

type CompetencyOption = {
  id: string
  name: string
}

type SeniorityOption = {
  profileId: string
  code: string
  label: string
}

type PositionSeniorityCompetencyMatrixSectionProps = {
  positionId: string
  setAction: (input: unknown) => Promise<{ success: boolean; message: string }>
  clearAction: (input: unknown) => Promise<{ success: boolean; message: string }>
  matrix: PositionSeniorityCompetencyMatrixViewModel
  competencies: CompetencyOption[]
  seniorities: SeniorityOption[]
  /**
   * Active BASE profile of the position. Every other profile id can be read off
   * the matrix cells, but in the zero state there are none — and Base is the
   * profile the first expectation almost always belongs to.
   */
  baseProfileId?: string | null
}

type MatrixColumn = {
  profileId: string
  code: string
  label: string
  base: boolean
}

const STATE_BADGE_CLASSES = {
  base: "bg-blue-100 text-blue-800",
  inherited: "bg-amber-100 text-amber-800",
  override: "bg-violet-100 text-violet-800",
  none: "bg-slate-100 text-slate-600",
} satisfies Record<CompetencyMatrixCellViewModel["state"], string>

function getColumns(
  cells: CompetencyMatrixCellViewModel[],
  seniorities: SeniorityOption[]
): MatrixColumn[] {
  const profileIds = new Set(
    cells.filter((cell) => cell.profileActive).map((cell) => cell.positionSeniorityProfileId)
  )
  const baseCell = cells.find((cell) => cell.profileActive && cell.isBaseProfile)

  return [
    ...(baseCell
      ? [
          {
            profileId: baseCell.positionSeniorityProfileId,
            code: "",
            label: "Base",
            base: true,
          },
        ]
      : []),
    ...seniorities
      .filter((seniority) => profileIds.has(seniority.profileId))
      .map((seniority) => ({ ...seniority, base: false })),
  ]
}

function MatrixCell({ cell }: { cell: CompetencyMatrixCellViewModel | undefined }) {
  if (!cell || cell.state === "none") {
    return (
      <div className="min-w-44 space-y-2" aria-label="Expectativa não definida">
        <Badge className={STATE_BADGE_CLASSES.none}>Não definido</Badge>
        <p className="text-xs text-slate-500">Sem expectativa configurada.</p>
      </div>
    )
  }

  return (
    <div
      className="min-w-44 space-y-2"
      aria-label={`${cell.stateLabel}: ${cell.expectedLevelLabel ?? "nível não definido"}`}
    >
      <Badge className={STATE_BADGE_CLASSES[cell.state]}>{cell.stateLabel}</Badge>
      <div className="space-y-1 text-xs text-slate-600">
        <p>
          <span className="font-medium text-slate-800">Proficiência:</span>{" "}
          {cell.expectedLevelLabel}
        </p>
        <p>
          <span className="font-medium text-slate-800">Peso:</span>{" "}
          {cell.weightLabel}
        </p>
        <p>
          <span className="font-medium text-slate-800">Tipo:</span>{" "}
          {cell.typeLabel}
        </p>
        <p>{cell.required ? "Obrigatória" : "Não obrigatória"}</p>
        {cell.notes ? (
          <p className="max-w-56 border-t border-slate-100 pt-2 text-slate-500">
            {cell.notes}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function PositionSeniorityCompetencyMatrixSection({
  positionId,
  setAction,
  clearAction,
  matrix,
  competencies,
  seniorities,
  baseProfileId = null,
}: PositionSeniorityCompetencyMatrixSectionProps) {
  // The add affordance is built once and rendered by BOTH branches below. The
  // zero-row state is precisely where the first expectation has to be created,
  // so offering this only alongside existing cells would leave the defect it
  // exists to fix exactly as it was.
  const canAddExpectation =
    competencies.length > 0 && (baseProfileId !== null || seniorities.length > 0)

  const addExpectationAction = canAddExpectation ? (
    <AddPositionSeniorityCompetencyDialog
      positionId={positionId}
      baseProfileId={baseProfileId}
      seniorityProfiles={seniorities.map((seniority) => ({
        profileId: seniority.profileId,
        label: seniority.label,
      }))}
      competencies={competencies}
      cells={matrix.cells}
      setAction={setAction}
    />
  ) : null

  if (matrix.cells.length === 0) {
    const hasSpecificProfiles = seniorities.length > 0

    return (
      <DashboardSection
        title="Matriz de competências por senioridade"
        description="Compare as expectativas Base do cargo com as expectativas de cada senioridade."
        actions={addExpectationAction}
      >
        <DashboardCard>
          <DashboardEmptyState
            title={
              hasSpecificProfiles
                ? "Nenhuma competência na matriz"
                : "Nenhuma senioridade ativa para comparar"
            }
            description={
              canAddExpectation
                ? "Este cargo ainda não tem expectativas de competência. Use “Adicionar competência à matriz” para criar a primeira — comece pela Base para valer em todas as senioridades."
                : competencies.length === 0
                  ? "Cadastre competências no catálogo da empresa para poder definir as expectativas deste cargo."
                  : "Configure senioridades aplicáveis ao cargo para comparar expectativas específicas com a Base."
            }
          />
        </DashboardCard>
      </DashboardSection>
    )
  }

  const columns = getColumns(matrix.cells, seniorities)
  const competencyNames = new Map(
    competencies.map((competency) => [competency.id, competency.name])
  )
  const competencyIds = Array.from(
    new Set(matrix.cells.map((cell) => cell.competencyId))
  ).sort((left, right) =>
    (competencyNames.get(left) ?? "").localeCompare(
      competencyNames.get(right) ?? "",
      "pt-BR"
    )
  )
  const cellsByKey = new Map(
    matrix.cells.map((cell) => [
      `${cell.competencyId}:${cell.positionSeniorityProfileId}`,
      cell,
    ])
  )

  return (
    <DashboardSection
      title="Matriz de competências por senioridade"
      description="Compare as expectativas Base do cargo com as expectativas herdadas ou específicas de cada senioridade. Clique em uma célula para editá-la."
      actions={addExpectationAction}
    >
      <DashboardCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse">
            <caption className="sr-only">
              Competências do cargo por perfil de senioridade, com a coluna Base primeiro.
            </caption>
            <thead className="bg-slate-50">
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-56 border-r border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-700"
                >
                  Competência
                </th>
                {columns.map((column) => (
                  <th
                    key={column.profileId}
                    scope="col"
                    className={`min-w-52 px-4 py-3 text-left text-sm font-semibold ${
                      column.base ? "bg-blue-50 text-blue-900" : "text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {column.code ? <Badge>{column.code}</Badge> : null}
                    </div>
                    {column.base ? (
                      <p className="mt-1 text-xs font-normal text-blue-700">
                        Expectativa comum do cargo
                      </p>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {competencyIds.map((competencyId) => (
                <tr key={competencyId} className="border-t border-slate-200">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border-r border-slate-200 bg-white px-4 py-4 text-left align-top text-sm font-medium text-slate-900"
                  >
                    {competencyNames.get(competencyId) ?? "Competência não identificada"}
                  </th>
                  {columns.map((column) => (
                    <td
                      key={column.profileId}
                      className={`px-4 py-4 align-top ${column.base ? "bg-blue-50/50" : ""}`}
                    >
                      {(() => {
                        const cell = cellsByKey.get(
                          `${competencyId}:${column.profileId}`
                        )
                        if (!cell) return <MatrixCell cell={undefined} />

                        const competencyName =
                          competencyNames.get(competencyId) ??
                          "Competência não identificada"

                        return (
                          <PositionSeniorityCompetencyEditorDialog
                            positionId={positionId}
                            competencyName={competencyName}
                            profileLabel={column.label}
                            cell={cell}
                            setAction={setAction}
                            clearAction={clearAction}
                            trigger={
                              <button
                                type="button"
                                className="w-full rounded-md p-1 text-left outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500"
                                aria-label={`Editar ${competencyName} no perfil ${column.label}. ${cell.stateLabel}.`}
                              >
                                <MatrixCell cell={cell} />
                              </button>
                            }
                          />
                        )
                      })()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </DashboardSection>
  )
}
