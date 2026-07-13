import { DataTable } from "@/components/shared/data-table"

import {
  ArchivePositionRequirementButton,
} from "./archive-position-requirement-button"

import {
  PositionRequirementEditDialog,
} from "./position-requirement-edit-dialog"

import type {
  PositionRequirement,
} from "../types/position-requirement"

function getCategoryLabel(
  category: PositionRequirement["category"]
) {
  switch (category) {
    case "education":
      return "Formação"

    case "experience":
      return "Experiência"

    case "certification":
      return "Certificação"

    case "language":
      return "Idioma"

    case "knowledge":
      return "Conhecimento"

    default:
      return "Outro"
  }
}

type PositionRequirementsTableProps = {
  requirements: PositionRequirement[]
}

export function PositionRequirementsTable({
  requirements,
}: PositionRequirementsTableProps) {
  return (
    <DataTable
      title="Requisitos Técnicos"
      data={requirements}
      rowKey={(requirement) => requirement.id}
      emptyMessage="Nenhum requisito técnico cadastrado."
      columns={[
        {
          key: "category",
          header: "Categoria",
          render: (requirement) =>
            getCategoryLabel(
              requirement.category
            ),
        },
        {
          key: "value",
          header: "Requisito",
          render: (requirement) => (
            <span className="font-medium">
              {requirement.value}
            </span>
          ),
        },
        {
          key: "required",
          header: "Obrigatório",
          render: (requirement) =>
            requirement.required
              ? "Sim"
              : "Desejável",
        },
        {
          key: "actions",
          header: "Ações",
          render: (requirement) => (
            <div className="flex gap-2">
              <PositionRequirementEditDialog
                positionRequirement={
                  requirement
                }
              />

              <ArchivePositionRequirementButton
                positionRequirementId={
                  requirement.id
                }
                positionId={
                  requirement.position_id
                }
              />
            </div>
          ),
        },
      ]}
    />
  )
}