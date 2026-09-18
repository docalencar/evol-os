import Link from "next/link"

import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"

import type { DevelopmentTemplate } from "../types/development-template"
import { ObsoleteDevelopmentTemplateButton } from "./obsolete-development-template-button"

type DevelopmentTemplateTableProps = {
  templates: DevelopmentTemplate[]
}

function getScopeLabel(
  scope: DevelopmentTemplate["scope"]
) {
  switch (scope) {
    case "global":
      return "Global"

    case "company":
      return "Empresa"

    default:
      return scope
  }
}

export function DevelopmentTemplateTable({
  templates,
}: DevelopmentTemplateTableProps) {
  return (
    <DataTable
      title="Templates"
      data={templates}
      rowKey={(template) => template.id}
      emptyMessage="Nenhum template cadastrado."
      columns={[
        {
          key: "name",
          header: "Nome",
          render: (template) => (
            <Link
              href={`/app/development/templates/${template.id}`}
              className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              {template.name}
            </Link>
          ),
        },
        {
          key: "scope",
          header: "Escopo",
          render: (template) => (
            <Badge className="bg-slate-100 text-slate-700">
              {getScopeLabel(template.scope)}
            </Badge>
          ),
        },
        {
          key: "duration",
          header: "Duração",
          render: (template) =>
            template.suggestedDurationDays
              ? `${template.suggestedDurationDays} dias`
              : "-",
        },
        {
          key: "status",
          header: "Status",
          render: (template) => (
            <Badge
              className={
                template.active
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }
            >
              {template.active ? "Ativo" : "Inativo"}
            </Badge>
          ),
        },
        {
          key: "actions",
          header: "Ações",
          render: (template) => (
            // No edit control: a published version is immutable under D-P0 and
            // there is no trusted operation behind "edit template". `active` is
            // the compatibility mirror the boundary maintains, so it still says
            // whether a published version exists to make obsolete.
            <div className="flex flex-wrap gap-2">
              {template.active ? (
                <ObsoleteDevelopmentTemplateButton
                  templateId={template.id}
                />
              ) : null}
            </div>
          ),
        },
      ]}
    />
  )
}
