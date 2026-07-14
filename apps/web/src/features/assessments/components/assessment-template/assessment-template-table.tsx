import Link from "next/link"

import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"

import {
  ASSESSMENT_TEMPLATE_STATUS_LABELS,
  ASSESSMENT_TEMPLATE_TYPE_LABELS,
} from "../../constants/assessment-template-options"
import type {
  AssessmentTemplate,
  AssessmentTemplateStatus,
} from "../../types/assessment-template"
import { ArchiveAssessmentTemplateButton } from "./archive-assessment-template-button"
import { AssessmentTemplateEditDialog } from "./assessment-template-edit-dialog"

type AssessmentTemplateTableProps = {
  templates: AssessmentTemplate[]
}

function getStatusClassName(status: AssessmentTemplateStatus) {
  switch (status) {
    case "active":
      return "border-emerald-200 bg-emerald-50 text-emerald-700"

    case "draft":
      return "border-slate-200 bg-slate-50 text-slate-700"

    case "archived":
      return "border-amber-200 bg-amber-50 text-amber-700"

    default:
      return ""
  }
}

export function AssessmentTemplateTable({
  templates,
}: AssessmentTemplateTableProps) {
  return (
    <DataTable
      title="Templates de avaliação"
      data={templates}
      rowKey={(template) => template.id}
      emptyMessage="Nenhum template de avaliação cadastrado."
      columns={[
        {
          key: "name",
          header: "Template",
          render: (template) => (
            <div className="max-w-md">
              <Link
                href={`/app/assessments/templates/${template.id}`}
                className="font-medium text-slate-900 transition-colors hover:text-blue-600 hover:underline"
              >
                {template.name}
              </Link>

              <p className="line-clamp-2 text-sm text-muted-foreground">
                {template.description ||
                  "Template sem descrição cadastrada."}
              </p>
            </div>
          ),
        },
        {
          key: "type",
          header: "Tipo",
          render: (template) =>
            ASSESSMENT_TEMPLATE_TYPE_LABELS[template.type],
        },
        {
          key: "status",
          header: "Status",
          render: (template) => (
            <Badge className={getStatusClassName(template.status)}>
              {ASSESSMENT_TEMPLATE_STATUS_LABELS[
                template.status
              ]}
            </Badge>
          ),
        },
        {
          key: "actions",
          header: "Ações",
          render: (template) => (
            <div className="flex items-center gap-2">
              <AssessmentTemplateEditDialog
                companyId={template.company_id ?? ""}
                template={template}
              />

              <ArchiveAssessmentTemplateButton
                companyId={template.company_id ?? ""}
                assessmentTemplateId={template.id}
              />
            </div>
          ),
        },
      ]}
    />
  )
}
