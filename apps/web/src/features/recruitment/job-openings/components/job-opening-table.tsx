import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  JOB_OPENING_PRIORITY_LABELS,
  JOB_OPENING_STATUS_LABELS,
} from "../constants/job-opening-options"
import type {
  JobOpening,
} from "../types/job-opening"

type JobOpeningRelationOption = {
  id: string
  name: string
}

type JobOpeningEmployeeOption = {
  id: string
  fullName: string
}

type JobOpeningTableProps = {
  jobOpenings: JobOpening[]
  positions: JobOpeningRelationOption[]
  departments: JobOpeningRelationOption[]
  employees: JobOpeningEmployeeOption[]
}

function formatDate(
  date: string | null,
  emptyLabel: string
) {
  if (!date) {
    return emptyLabel
  }

  const normalizedDate = date.includes("T")
    ? date
    : `${date}T00:00:00`

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(normalizedDate)
  )
}

export function JobOpeningTable({
  jobOpenings,
  positions,
  departments,
  employees,
}: JobOpeningTableProps) {
  const positionNameById = new Map(
    positions.map((position) => [
      position.id,
      position.name,
    ])
  )

  const departmentNameById = new Map(
    departments.map((department) => [
      department.id,
      department.name,
    ])
  )

  const employeeNameById = new Map(
    employees.map((employee) => [
      employee.id,
      employee.fullName,
    ])
  )

  return (
    <DataTable
      title="Vagas"
      data={jobOpenings}
      rowKey={(jobOpening) => jobOpening.id}
      columns={[
        {
          key: "status",
          header: "Status",
          render: (jobOpening) => (
            <Badge>
              {JOB_OPENING_STATUS_LABELS[jobOpening.status]}
            </Badge>
          ),
        },
        {
          key: "priority",
          header: "Prioridade",
          render: (jobOpening) => (
            <Badge>
              {JOB_OPENING_PRIORITY_LABELS[jobOpening.priority]}
            </Badge>
          ),
        },
        {
          key: "title",
          header: "Título",
          render: (jobOpening) => (
            <span className="font-medium text-slate-900">
              {jobOpening.title}
            </span>
          ),
        },
        {
          key: "position",
          header: "Cargo",
          render: (jobOpening) =>
            positionNameById.get(jobOpening.positionId) ??
            "Cargo não encontrado",
        },
        {
          key: "department",
          header: "Departamento",
          render: (jobOpening) =>
            departmentNameById.get(jobOpening.departmentId) ??
            "Departamento não encontrado",
        },
        {
          key: "owner",
          header: "Responsável",
          render: (jobOpening) =>
            employeeNameById.get(
              jobOpening.recruiterId ??
                jobOpening.requestingManagerId
            ) ?? "Responsável não encontrado",
        },
        {
          key: "targetHireDate",
          header: "Data prevista",
          render: (jobOpening) => (
            <span className="whitespace-nowrap">
              {formatDate(
                jobOpening.targetHireDate,
                "Sem data prevista"
              )}
            </span>
          ),
        },
        {
          key: "updatedAt",
          header: "Última atualização",
          render: (jobOpening) => (
            <span className="whitespace-nowrap">
              {formatDate(jobOpening.updatedAt, "-")}
            </span>
          ),
        },
        {
          key: "actions",
          header: "Ações",
          render: () => (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm">
                Visualizar
              </Button>

              <Button type="button" variant="secondary" size="sm">
                Editar
              </Button>
            </div>
          ),
        },
      ]}
    />
  )
}
