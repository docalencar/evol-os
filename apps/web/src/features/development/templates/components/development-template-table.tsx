import Link from "next/link"

import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"

import type { DevelopmentTemplateAuthoringVersion } from "../queries/resolve-development-template-authoring-version"
import { ObsoleteDevelopmentTemplateButton } from "./obsolete-development-template-button"

type DevelopmentTemplateTableProps = {
  /**
   * Authoring VERSIONS, newest per container. The list shows the lifecycle the
   * database actually has — draft, published, obsolete — instead of the legacy
   * `active` boolean, which is a compatibility mirror and cannot distinguish a
   * draft from a retired template.
   */
  templates: DevelopmentTemplateAuthoringVersion[]
}

const STATUS_PRESENTATION: Readonly<
  Record<DevelopmentTemplateAuthoringVersion["status"], { label: string; className: string }>
> = {
  draft: { label: "Rascunho", className: "bg-amber-100 text-amber-700" },
  published: { label: "Publicado", className: "bg-emerald-100 text-emerald-700" },
  obsolete: { label: "Obsoleto", className: "bg-slate-100 text-slate-600" },
}

export function DevelopmentTemplateTable({
  templates,
}: DevelopmentTemplateTableProps) {
  return (
    <DataTable
      title="Templates"
      data={templates}
      rowKey={(template) => template.templateVersionId}
      emptyMessage="Nenhum template cadastrado."
      columns={[
        {
          key: "name",
          header: "Nome",
          render: (template) => (
            <Link
              href={`/app/development/templates/${template.templateId}`}
              className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              {template.name}
            </Link>
          ),
        },
        {
          key: "version",
          header: "Versão",
          render: (template) => `v${template.versionNumber}`,
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
            <Badge className={STATUS_PRESENTATION[template.status].className}>
              {STATUS_PRESENTATION[template.status].label}
            </Badge>
          ),
        },
        {
          key: "actions",
          header: "Ações",
          render: (template) => (
            // No edit control: a published version is immutable under D-P0 and
            // there is no trusted operation behind "edit template". Obsoleting
            // is offered only where the lifecycle allows it — on a PUBLISHED
            // version — rather than wherever the legacy `active` flag happened
            // to be true.
            <div className="flex flex-wrap gap-2">
              {template.status === "published" ? (
                <ObsoleteDevelopmentTemplateButton
                  templateId={template.templateId}
                />
              ) : null}
            </div>
          ),
        },
      ]}
    />
  )
}
