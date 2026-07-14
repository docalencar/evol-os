import Link from "next/link"
import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"

import {
  ASSESSMENT_CYCLE_STATUS_LABELS,
  ASSESSMENT_CYCLE_TYPE_LABELS,
} from "../../constants/assessment-cycle-options"
import type {
  AssessmentCycle,
  AssessmentCycleStatus,
} from "../../types/assessment-cycle"
import type { AssessmentTemplate } from "../../types/assessment-template"
import { ArchiveAssessmentCycleButton } from "./archive-assessment-cycle-button"
import { AssessmentCycleEditDialog } from "./assessment-cycle-edit-dialog"

type AssessmentCycleTableProps = {
  cycles: AssessmentCycle[]
  templates: AssessmentTemplate[]
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-")

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

function getStatusClassName(status: AssessmentCycleStatus) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"

    case "scheduled":
      return "border-amber-200 bg-amber-50 text-amber-700"

    case "completed":
      return "border-blue-200 bg-blue-50 text-blue-700"

    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700"

    case "draft":
      return "border-slate-200 bg-slate-50 text-slate-700"

    default:
      return ""
  }
}

export function AssessmentCycleTable({
  cycles,
  templates,
}: AssessmentCycleTableProps) {
  return (
    <DataTable
      title="Ciclos de avaliação"
      data={cycles}
      rowKey={(cycle) => cycle.id}
      emptyMessage="Nenhum ciclo de avaliação cadastrado."
      columns={[
        {
          key: "name",
          header: "Ciclo",
          render: (cycle) => (
            <div>
              <Link
                href={`/app/assessments/cycles/${cycle.id}`}
                className="font-medium text-slate-900 transition hover:text-primary hover:underline"
              >
                {cycle.name}
              </Link>

              <p className="text-sm text-muted-foreground">
                {ASSESSMENT_CYCLE_TYPE_LABELS[
                  cycle.assessment_type
                ]}
              </p>
            </div>
          ),
        },
        {
          key: "period",
          header: "Período",
          render: (cycle) =>
            `${formatDate(cycle.start_date)} a ${formatDate(
              cycle.end_date
            )}`,
        },
        {
          key: "status",
          header: "Status",
          render: (cycle) => (
           <Badge className={getStatusClassName(cycle.status)}>
              {ASSESSMENT_CYCLE_STATUS_LABELS[cycle.status]}
            </Badge>
          ),
        },
        {
          key: "actions",
          header: "Ações",
          render: (cycle) => (
            <div className="flex items-center gap-2">
              <AssessmentCycleEditDialog
                companyId={cycle.company_id}
                cycle={cycle}
                templates={templates}
              />

              <ArchiveAssessmentCycleButton
                companyId={cycle.company_id}
                assessmentCycleId={cycle.id}
              />
            </div>
          ),
        },
      ]}
    />
  )
}
